import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { authorizeStudentAccess } from "../middlewares/ownershipMiddleware";

const prisma = new PrismaClient();
const router = Router();

// Create student (Admin + Teacher)
router.post(
  "/",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  async (req, res) => {
    try {
      console.log("🔥 CREATE STUDENT ROUTE HIT");
      console.log("📦 RAW BODY:", req.body);

      let { firstName, lastName, classId, admissionNo, dob, userId } = req.body;

      // ✅ Normalize types (CRITICAL FIX)
      classId = classId ? Number(classId) : null;
      userId = userId ? Number(userId) : null;

      console.log("🔄 NORMALIZED:", {
        firstName,
        lastName,
        classId,
        admissionNo,
        dob,
        userId,
      });

      // ✅ VALIDATION (prevents 500 crashes)
      if (!firstName || !lastName) {
        return res.status(400).json({
          message: "firstName and lastName are required",
        });
      }

      if (!classId || isNaN(classId)) {
        return res.status(400).json({
          message: "Valid classId is required",
        });
      }

      if (!admissionNo) {
        return res.status(400).json({
          message: "admissionNo is required",
        });
      }

      if (!userId || isNaN(userId)) {
        return res.status(400).json({
          message: "Valid userId is required",
        });
      }

      // ✅ Check foreign keys BEFORE create (prevents Prisma crash)
      const existingClass = await prisma.class.findUnique({
        where: { id: classId },
      });

      if (!existingClass) {
        return res.status(400).json({
          message: "Class not found",
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        return res.status(400).json({
          message: "User not found",
        });
      }

      // ✅ Create student safely
      const student = await prisma.student.create({
        data: {
          firstName,
          lastName,
          classId,
          admissionNo,
          dob: dob ? new Date(dob) : null,
          userId,
        },
      });

      console.log("✅ STUDENT CREATED:", student);

      res.status(201).json(student);
    } catch (err: any) {
      console.error("❌ CREATE STUDENT ERROR:");
      console.error("Message:", err.message);
      console.error("Meta:", err.meta);
      console.error("Stack:", err.stack);

      res.status(500).json({
        message: "Student creation failed",
        error: err.message,
        meta: err.meta || null,
      });
    }
  }
);

// ✅ Get ALL students (EXCLUDES archived)
router.get(
  "/",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  async (req, res) => {
    try {
      const students = await prisma.student.findMany({
        where: {
          isArchived: false,
        },
        orderBy: { id: "asc" },
        include: {
          class: true,
          user: true,
          parentLinks: {
            include: {
              parent: true,
            },
          },
        },
      });

      res.json(students);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ✅ Get ARCHIVED students
router.get(
  "/archived",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const students = await prisma.student.findMany({
        where: {
          isArchived: true,
        },
        include: {
          class: true,
        },
      });

      res.json(students);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch archived students" });
    }
  }
);

// Get student (RBAC ownership check)
router.get(
  "/:id",
  authenticate,
  authorizeStudentAccess,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const student = await prisma.student.findUnique({
        where: { id },
        include: {
          class: true,
          user: true,
          parentLinks: {
            include: {
              parent: true,
            },
          },
          guardians: { include: { user: true } },
          sponsorships: { include: { sponsor: true } },
          enrollments: { include: { subject: true } },
          grades: true,
          invoices: true,
          disciplines: true,
        },
      });

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      res.json(student);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ✅ DELETE → ARCHIVE
router.delete(
  "/:id",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      await prisma.student.update({
        where: { id: Number(req.params.id) },
        data: { isArchived: true },
      });

      res.json({ message: "Student archived" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to archive student" });
    }
  }
);

// ✅ RESTORE student
router.put(
  "/:id/restore",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      await prisma.student.update({
        where: { id: Number(req.params.id) },
        data: { isArchived: false },
      });

      res.json({ message: "Student restored" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Restore failed" });
    }
  }
);

export default router;