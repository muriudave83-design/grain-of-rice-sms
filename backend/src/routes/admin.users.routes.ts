import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import {
  listUsers,
  archiveUser,
} from "../controllers/admin.users.controller";

const router = Router();

/**
 * Utility: Generate temporary password
 */
function generateTempPassword(length = 10) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * ✅ GET /api/admin/stats
 */
router.get(
  "/stats",
  authenticate,
  requireRole(["ADMIN"]),
  async (_req, res) => {
    try {
      const students = await prisma.student.count();

      const teachers = await prisma.user.count({
        where: { role: "TEACHER" },
      });

      const parents = await prisma.user.count({
        where: { role: "PARENT" },
      });

      const classes = await prisma.class.count();

      return res.json({
        students,
        teachers,
        parents,
        classes,
      });
    } catch (error) {
      console.error("Failed to load admin stats:", error);
      return res.status(500).json({ message: "Failed to load stats" });
    }
  }
);

/**
 * ✅ GET /api/admin/users
 */
router.get(
  "/users",
  authenticate,
  requireRole(["ADMIN"]),
  listUsers
);

/**
 * 🗂️ PATCH /api/admin/users/:id/archive
 */
router.patch(
  "/users/:id/archive",
  authenticate,
  requireRole(["ADMIN"]),
  archiveUser
);

/**
 * 🔐 PATCH /api/admin/users/:id/reset-password
 */
router.patch(
  "/users/:id/reset-password",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const userId = Number(req.params.id);

      if (Number.isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if ((req as any).user?.id === userId) {
        return res.status(400).json({
          message: "You cannot reset your own password here",
        });
      }

      const tempPassword = generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          mustChangePassword: true,
        },
      });

      return res.json({
        message: "Password reset successfully",
        temporaryPassword: tempPassword,
      });
    } catch (error) {
      console.error("Failed to reset password:", error);
      return res.status(500).json({
        message: "Failed to reset password",
      });
    }
  }
);

/**
 * Shared admin user creation helper
 */
async function createUser({
  name,
  email,
  password,
  role,
}: {
  name: string;
  email: string;
  password: string;
  role: "TEACHER" | "PARENT";
}) {
  if (!name || !email || !password) {
    throw new Error("All fields are required");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      mustChangePassword: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
}

/**
 * POST /api/admin/users/teacher
 */
router.post(
  "/users/teacher",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const user = await createUser({
        ...req.body,
        role: "TEACHER",
      });

      return res.status(201).json(user);
    } catch (error: any) {
      console.error("Failed to create teacher:", error);
      return res.status(400).json({ message: error.message });
    }
  }
);

/**
 * POST /api/admin/users/parent
 */
router.post(
  "/users/parent",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const user = await createUser({
        ...req.body,
        role: "PARENT",
      });

      return res.status(201).json(user);
    } catch (error: any) {
      console.error("Failed to create parent:", error);
      return res.status(400).json({ message: error.message });
    }
  }
);

/**
 * 🚨 TEMPORARY TEST ROUTE
 */
router.post(
  "/users/student",
  authenticate,
  requireRole(["ADMIN"]),
  async (_req, res) => {
    return res.status(400).json({
      message: "BACKEND VERSION TEST 123",
    });
  }
);

/**
 * POST /api/admin/students/:studentId/link-user
 */
router.post(
  "/students/:studentId/link-user",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    const studentId = Number(req.params.studentId);
    const { userId } = req.body;

    if (Number.isNaN(studentId) || !userId) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== "STUDENT") {
      return res.status(400).json({
        message: "User must exist and have STUDENT role",
      });
    }

    if (student.userId) {
      return res.status(409).json({
        message: "Student already linked to a user",
      });
    }

    const userAlreadyLinked = await prisma.student.findFirst({
      where: { userId },
    });

    if (userAlreadyLinked) {
      return res.status(409).json({
        message: "This user is already linked to another student",
      });
    }

    await prisma.student.update({
      where: { id: studentId },
      data: { userId: user.id },
    });

    return res.json({
      message: "Student successfully linked to user",
    });
  }
);

export default router;