import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { listUsers } from "../controllers/admin.users.controller";

const router = Router();

/**
 * ✅ GET /api/admin/stats
 * Real dashboard numbers
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
 * ✅ FIXED: POST /api/admin/users/student
 * Atomic creation of User + Student with transaction
 */
router.post(
  "/users/student",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        admissionNo,
        classId,
        email,
        password,
        dob,
      } = req.body;

      if (
        !firstName ||
        !lastName ||
        !admissionNo ||
        !email ||
        !password ||
        !classId
      ) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(409).json({ message: "Email already in use" });
      }

      const existingStudent = await prisma.student.findUnique({
        where: { admissionNo },
      });

      if (existingStudent) {
        return res
          .status(409)
          .json({ message: "Admission number already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: `${firstName} ${lastName}`,
            email,
            password: hashedPassword,
            role: "STUDENT",
            mustChangePassword: true,
          },
        });

        const student = await tx.student.create({
          data: {
            firstName,
            lastName,
            admissionNo,
            dob: dob ? new Date(dob) : undefined,
            classId,
            userId: user.id,
          },
        });

        return { user, student };
      });

      return res.status(201).json(result);
    } catch (error: any) {
      console.error("Failed to create student:", error);
      return res.status(400).json({ message: error.message });
    }
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