import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../prisma/client";
import { createAuditLog } from "../services/auditLog.service";
import { Role } from "@prisma/client";

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
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(users);
  } catch (err) {
    console.error("Failed to list users:", err);
    res.status(500).json({ message: "Failed to fetch users" });
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent admin resetting themselves
    if (user.id === req.user!.id) {
      return res.status(400).json({
        message: "You cannot reset your own password.",
      });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashed = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashed,
        mustChangePassword: true,
      },
    });

    await createAuditLog({
      action: "USER_PASSWORD_RESET",
      entityType: "User",
      entityId: String(user.id),
      actorUserId: String(req.user!.id),
      actorRole: req.user!.role,
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
  const { name, email, tempPassword } = req.body;

  if (!name || !email || !tempPassword) {
    return res.status(400).json({ message: "Missing required fields" });
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
    action: "USER_CREATED",
    entityType: "User",
    entityId: String(user.id),
    actorUserId: String(req.user!.id),
    actorRole: req.user!.role,
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