import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import {
  listUsers,
  archiveUser,
  updateUser,
} from "../controllers/admin.users.controller";
import { normalizeEmail } from "../utils/password";
import { getTeacherPermanentDeletePreview, permanentlyDeleteTeacher } from "../services/permanentTestDataDeletion.service";

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
      const [students, teachers, parents, classes] = await Promise.all([
        prisma.student.count(),
        prisma.user.count({ where: { role: "TEACHER" } }),
        prisma.user.count({ where: { role: "PARENT" } }),
        prisma.class.count(),
      ]);

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
 * ✏️ PATCH /api/admin/users/:id (Update user)
 */
router.patch(
  "/users/:id",
  authenticate,
  requireRole(["ADMIN"]),
  updateUser
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

      if (!userId) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!req.user) {
        return res.status(401).json({
          message: "Unauthorized",
        });
      }

      if (req.user.id === userId) {
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
 * POST /api/admin/users/teacher
 */
router.post(
  "/users/teacher",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const { name, password } = req.body;
      const email = typeof req.body.email === "string"
        ? normalizeEmail(req.body.email)
        : "";

      if (!name || !email || !password) {
        return res.status(400).json({ message: "Missing fields" });
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "TEACHER",
          mustChangePassword: true,
        },
        select: { id: true, name: true, email: true, role: true },
      });

      return res.status(201).json(user);
    } catch (error: any) {
      console.error("Failed to create teacher:", error);
      return res.status(400).json({ message: error.message });
    }
  }
);

router.get(
  "/users/:id/permanent-delete-preview",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      res.json(await getTeacherPermanentDeletePreview(prisma, Number(req.params.id), req.user!.id));
    } catch (error) {
      res.status((error as any).status || 500).json({ message: (error as any).message || "Failed to preview permanent deletion" });
    }
  },
);

router.delete(
  "/users/:id/permanent",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const preview = await permanentlyDeleteTeacher(prisma, Number(req.params.id), req.user!.id, req.body?.confirmation);
      res.json({ message: "Teacher permanently deleted", preview });
    } catch (error) {
      res.status((error as any).status || 500).json({ message: (error as any).message || "Failed to permanently delete Teacher", preview: (error as any).preview });
    }
  },
);

/**
 * CREATE ADMIN
 */
router.post(
  "/users/admin",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const { name, password } = req.body;
      const email = typeof req.body.email === "string"
        ? normalizeEmail(req.body.email)
        : "";

      if (!name || !email || !password) {
        return res.status(400).json({ message: "Missing fields" });
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email,
          password: hashedPassword,
          role: "ADMIN",
          mustChangePassword: true,
        },
        select: { id: true, name: true, email: true, role: true },
      });

      return res.status(201).json(user);
    } catch (error: any) {
      console.error("Failed to create admin:", error);
      return res.status(400).json({ message: error.message });
    }
  }
);

/**
 * ✅ CREATE ATTENDANCE OFFICER
 */
router.post(
  "/users/attendance-officer",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const { name, password } = req.body;
      const email = typeof req.body.email === "string"
        ? normalizeEmail(req.body.email)
        : "";

      if (!name || !email || !password) {
        return res.status(400).json({
          message: "Missing fields",
        });
      }

      const existing =
        await prisma.user.findUnique({
          where: { email },
        });

      if (existing) {
        return res.status(400).json({
          message: "User already exists",
        });
      }

      const hashedPassword =
        await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "ATTENDANCE_OFFICER",
          mustChangePassword: true,
        },
        select: { id: true, name: true, email: true, role: true },
      });

      return res.status(201).json(user);
    } catch (error: any) {
      console.error(
        "Failed to create attendance officer:",
        error
      );

      return res.status(400).json({
        message: error.message,
      });
    }
  }
);

/**
 * ✅ CREATE PARENT (USER + PARENT LINKED)
 */
router.post(
  "/users/parent",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const { name, password } = req.body;
      const email = typeof req.body.email === "string"
        ? normalizeEmail(req.body.email)
        : "";

      if (!name || !email || !password) {
        return res.status(400).json({ message: "Missing fields" });
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "PARENT",
          mustChangePassword: true,

          parent: {
            create: {
              name,
              email, // keep consistent
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          parent: true,
        },
      });

      return res.status(201).json(user);
    } catch (error: any) {
      console.error("Failed to create parent:", error);
      return res.status(400).json({ message: error.message });
    }
  }
);

/**
 * ✅ CREATE STUDENT (USER + STUDENT LINKED)
 */
router.post(
  "/users/student",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const { firstName, lastName, password, classId, admissionNo } = req.body;
      const email = typeof req.body.email === "string"
        ? normalizeEmail(req.body.email)
        : "";

      if (!firstName || !email || !password || !classId) {
        return res.status(400).json({
          message: "firstName, email, password, classId are required",
        });
      }

      const existing = await prisma.user.findUnique({
        where: { email },
      });

      if (existing) {
        return res.status(400).json({
          message: "User already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const schoolClass = await prisma.class.findFirst({
        where: { id: Number(classId), isArchived: false },
        select: { id: true, name: true },
      });
      if (!schoolClass) return res.status(400).json({ message: "Active Class not found" });

      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            name: `${firstName} ${lastName || ""}`.trim(),
            email,
            password: hashedPassword,
            role: "STUDENT",
            mustChangePassword: true,
            student: {
              create: {
                firstName,
                lastName,
                admissionNo:
                  typeof admissionNo === "string" && admissionNo.trim()
                    ? admissionNo.trim()
                    : Math.floor(Math.random() * 100000).toString(),
                classId: schoolClass.id,
              },
            },
          },
          select: { id: true, name: true, email: true, role: true, student: true },
        });
        await tx.studentClassEnrollment.create({
          data: {
            studentId: created.student!.id,
            classId: schoolClass.id,
            classNameSnapshot: schoolClass.name,
            startedAt: new Date(),
            status: "CURRENT",
            source: "ADMISSION",
          },
        });
        return created;
      });

      return res.status(201).json(user);
    } catch (error) {
      console.error("Create student error:", error);
      return res.status(500).json({
        message: "Failed to create student user",
      });
    }
  }
);

/**
 * 🔗 POST /api/admin/students/:studentId/link-user
 * (KEEP — useful fallback)
 */
router.post(
  "/students/:studentId/link-user",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const studentId = Number(req.params.studentId);
      const userId = Number(req.body.userId);

      if (!studentId || !userId) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const [student, user] = await Promise.all([
        prisma.student.findUnique({ where: { id: studentId } }),
        prisma.user.findUnique({ where: { id: userId } }),
      ]);

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      if (!user || user.role !== "STUDENT") {
        return res.status(400).json({
          message: "User must exist and have STUDENT role",
        });
      }

      if (student.userId) {
        return res.status(409).json({
          message: "Student already linked",
        });
      }

      const alreadyLinked = await prisma.student.findFirst({
        where: { userId },
      });

      if (alreadyLinked) {
        return res.status(409).json({
          message: "User already linked to another student",
        });
      }

      await prisma.student.update({
        where: { id: studentId },
        data: { userId },
      });

      return res.json({
        message: "Student successfully linked to user",
      });
    } catch (error) {
      console.error("Link user error:", error);
      return res.status(500).json({
        message: "Failed to link user",
      });
    }
  }
);

export default router;
