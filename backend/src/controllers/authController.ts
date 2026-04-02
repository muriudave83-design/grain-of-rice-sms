import { Request, Response } from "express";
import { PrismaClient, AuditAction } from "@prisma/client";
import jwt from "jsonwebtoken";
import { createAuditLog } from "../services/auditLog.service";
import { hashPassword, verifyPassword } from "../utils/password";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// 🔥 DEFAULT PASSWORD (ADMIN-CONTROLLED)
const DEFAULT_PASSWORD = "password123";

// ======================================================
// REGISTER USER
// ======================================================
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, role } = req.body;

    const email = req.body.email?.toLowerCase()?.trim();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (role === "ADMIN") {
      return res.status(403).json({
        message: "Admin accounts cannot be created via public registration",
      });
    }

    const exists = await prisma.user.findUnique({
      where: { email },
    });

    if (exists) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    const hashedPassword = await hashPassword(DEFAULT_PASSWORD);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        isActive: true,
        isArchived: false,
        mustChangePassword: true,
      },
    });

    res.status(201).json({
      message: "User registered successfully",
      defaultPassword: DEFAULT_PASSWORD,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error("🔥 REGISTER ERROR:", err);

    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// ======================================================
// LOGIN USER
// ======================================================
export const loginUser = async (req: Request, res: Response) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message:
          "Empty request body — ensure Content-Type is application/json",
      });
    }

    const email = req.body.email?.toLowerCase()?.trim();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // ✅ INCLUDE PARENT RELATIONS
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        parentStudents: {
          include: {
            student: true,
          },
        },
      },
    });

    // ✅ BLOCK INVALID OR ARCHIVED USERS (CRITICAL)
    if (!user || user.isArchived) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // 🛡️ BLOCK DEACTIVATED ACCOUNTS
    if (!user.isActive) {
      return res.status(403).json({
        message: "Account is deactivated.",
      });
    }

    const validPassword = await verifyPassword(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("access_token", token, {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      path: "/",
      maxAge: 60 * 60 * 1000,
    });

    // ✅ FORMAT CHILDREN (FOR PARENTS)
    let children: any[] = [];

    if (user.role === "PARENT") {
      children = user.parentStudents.map((ps) => ({
        id: ps.student.id,
        firstName: ps.student.firstName,
        lastName: ps.student.lastName,
      }));
    }

    // ✅ CLEAN USER OBJECT
    const { password: _, parentStudents, ...safeUser } = user;

    // ✅ FINAL RESPONSE SHAPE (STANDARDIZED)
    return res.json({
      token,
      mustChangePassword: user.mustChangePassword,
      user: {
        ...safeUser,
        children,
      },
    });

  } catch (err: any) {
    console.error("🔥 LOGIN ERROR:", err);

    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// ======================================================
// CHANGE PASSWORD
// ======================================================
export const changePassword = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const isValid = await verifyPassword(
      currentPassword,
      user.password
    );

    if (!isValid) {
      return res.status(400).json({
        message: "Current password is incorrect.",
      });
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        mustChangePassword: false,
        updatedAt: new Date(),
      },
    });

    await createAuditLog({
      action: AuditAction.PASSWORD_CHANGED,
      entityType: "User",
      entityId: String(userId),
      actorUserId: String(userId),
      actorRole: userRole,
    });

    return res.json({
      message: "Password updated successfully.",
    });
  } catch (err: any) {
    console.error("🔥 CHANGE PASSWORD ERROR:", err);

    return res.status(500).json({
      message: "Server error.",
      error: err.message,
    });
  }
};