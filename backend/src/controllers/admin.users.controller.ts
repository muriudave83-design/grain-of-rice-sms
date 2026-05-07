import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../prisma/client";
import { createAuditLog } from "../services/auditLog.service";
import { Role, AuditAction } from "@prisma/client";

/**
 * ADMIN: List Users
 * GET /api/admin/users
 */
export const listUsers = async (req: Request, res: Response) => {
  try {
    const roleQuery = req.query.role as string | undefined;

    const role: Role | undefined =
      roleQuery && Object.values(Role).includes(roleQuery as Role)
        ? (roleQuery as Role)
        : undefined;

    const users = await prisma.user.findMany({
      where: role ? { role } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        mustChangePassword: true,
        isActive: true,
        isArchived: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(users);
  } catch (err) {
    console.error("Failed to list users:", err);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
};

/**
 * 🗂️ ADMIN: Archive User (Soft Delete)
 * PATCH /api/admin/users/:id/archive
 */
export const archiveUser = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const currentAdminId = req.user.id;

    if (!userId) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (userId === currentAdminId) {
      return res.status(400).json({
        message: "You cannot archive your own account.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role === "ADMIN") {
      const adminCount = await prisma.user.count({
        where: {
          role: "ADMIN",
          isArchived: false,
        },
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot archive the last active ADMIN.",
        });
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: existingUser.isArchived
        ? {
            // ✅ RESTORE USER
            isArchived: false,
            isActive: true,
          }
        : {
            // ✅ ARCHIVE USER
            isArchived: true,
            isActive: false,
          },
    });

    await createAuditLog({
      action: AuditAction.USER_UPDATED,
      entityType: "User",
      entityId: String(user.id),
      actorUserId: String(currentAdminId),
      actorRole: req.user.role,
      metadata: {
        archived: true,
      },
    });

    return res.json({ message: "User archived successfully." });
  } catch (error) {
    console.error("Failed to archive user:", error);
    return res.status(500).json({
      message: "Failed to archive user.",
    });
  }
};

/**
 * 🔐 ADMIN: Reset User Password
 * PATCH /api/admin/users/:id/reset-password
 */
export const resetUserPassword = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = Number(req.params.id);

    if (!userId) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({
        message: "You cannot reset your own password.",
      });
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
      },
    });

    await createAuditLog({
      action: AuditAction.USER_PASSWORD_RESET,
      entityType: "User",
      entityId: String(user.id),
      actorUserId: String(req.user.id),
      actorRole: req.user.role,
      metadata: {
        email: user.email,
      },
    });

    return res.json({
      message: "Password reset successful",
      temporaryPassword: tempPassword,
    });
  } catch (error) {
    console.error("Failed to reset password:", error);
    return res.status(500).json({
      message: "Failed to reset password",
    });
  }
};

/**
 * INTERNAL HELPER
 */
async function createUserInternal(
  req: Request,
  res: Response,
  role: "TEACHER" | "PARENT" | "STUDENT"
) {
  try {
    // ✅ FIXED: accept password instead of tempPassword
    const { name, password } = req.body;
    const tempPassword = password;

    // ✅ Normalize email to lowercase
    const email = req.body.email?.toLowerCase();

    // ✅ FIXED validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        mustChangePassword: true,
      },
    });

    await createAuditLog({
      action: AuditAction.USER_CREATED,
      entityType: "User",
      entityId: String(user.id),
      actorUserId: String(req.user.id),
      actorRole: req.user.role,
      metadata: {
        role,
        email,
      },
    });

    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error("Failed to create user:", error);
    return res.status(500).json({ message: "Failed to create user" });
  }
}

/**
 * ADMIN: Create Teacher
 */
export async function createTeacher(req: Request, res: Response) {
  return createUserInternal(req, res, "TEACHER");
}

/**
 * ADMIN: Create Parent
 */
export async function createParent(req: Request, res: Response) {
  return createUserInternal(req, res, "PARENT");
}

/**
 * ADMIN: Create Student
 */
export async function createStudent(req: Request, res: Response) {
  return createUserInternal(req, res, "STUDENT");
}

/**
 * ✏️ ADMIN: Update User (Edit Name / Email)
 * PATCH /api/admin/users/:id
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { name, email } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Normalize email
    const normalizedEmail = email?.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent duplicate email
    if (normalizedEmail && normalizedEmail !== user.email) {
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existing) {
        return res.status(409).json({ message: "Email already in use" });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name ?? user.name,
        email: normalizedEmail ?? user.email,
      },
    });

    await createAuditLog({
      action: AuditAction.USER_UPDATED,
      entityType: "User",
      entityId: String(user.id),
      actorUserId: String(req.user.id),
      actorRole: req.user.role,
      metadata: {
        updatedFields: { name, email },
      },
    });

    return res.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Failed to update user:", error);
    return res.status(500).json({
      message: "Failed to update user",
    });
  }
};