import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { authorizeStudentAccess } from "../middlewares/ownershipMiddleware";
import { getStudentTranscript } from "../controllers/student.controller";

const prisma = new PrismaClient();
const router = Router();
// ✅ TEST ROUTE (NO AUTH)
router.get("/test", (_req, res) => {
  res.json({ message: "student routes working ✅" });
});

// ✅ Student transcript route (TEMP: no ownership check)
router.get(
  "/:id/transcript",
  authenticate,
  getStudentTranscript
);

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
          discipline: true,
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

// 🔥 GET STUDENT DETAILS (ATTENDANCE + LOGS + HEALTH)
router.get(
  "/:id/details",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  async (req, res) => {
    const studentId = Number(req.params.id);

    try {
      // ✅ TEMP: no attendance system yet
      const present = 0;
      const absent = 0;

      // ✅ TEMP: no logs/health tables yet
      const parentLogs: any[] = [];
      const healthNotes = "";

      res.json({
        attendance: {
          present,
          absent,
        },
        parentLogs,
        healthNotes,
      });
    } catch (err) {
      console.error("STUDENT DETAILS ERROR:", err);
      res.status(500).json({
        message: "Failed to load student details",
      });
    }
  }
);

// 🔥 BULK CREATE STUDENTS FROM CSV
router.post(
  "/bulk",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    const rows = req.body;

    if (!Array.isArray(rows)) {
      return res.status(400).json({
        message: "Invalid data format",
      });
    }

    let created = 0;
    let failed = 0;
    const errors: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        const {
          firstName,
          lastName,
          admissionNo,
          className,
          parentName,
        } = row;

        // ✅ BASIC VALIDATION
        if (!firstName || !lastName || !admissionNo || !className) {
          failed++;
          errors.push({
            row: i + 1,
            message: "Missing required fields",
          });
          continue;
        }

        // ✅ FIND CLASS BY NAME
        const foundClass = await prisma.class.findFirst({
          where: {
            name: className.trim(),
          },
        });

        if (!foundClass) {
          failed++;
          errors.push({
            row: i + 1,
            message: `Class "${className}" not found`,
          });
          continue;
        }

        // ✅ CHECK DUPLICATE ADMISSION NUMBER
        const existing = await prisma.student.findFirst({
          where: { admissionNo: admissionNo.trim() },
        });

        if (existing) {
          failed++;
          errors.push({
            row: i + 1,
            message: `Admission number "${admissionNo}" already exists`,
          });
          continue;
        }

        // ✅ FIND PARENT (CORRECT MODEL + TYPE)
        let parentId: string | null = null;

        if (parentName) {
          const parent = await prisma.parent.findFirst({
            where: {
              name: parentName.trim(),
            },
          });

          if (parent) {
            parentId = parent.id; // ✅ STRING
          }
        }

        // ✅ CREATE STUDENT
        const student = await prisma.student.create({
          data: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            admissionNo: admissionNo.trim(),
            classId: foundClass.id,
          },
        });

        // ✅ LINK PARENT
        if (parentId) {
          await prisma.parentStudent.create({
            data: {
              studentId: student.id,
              parentId: parentId, // ✅ STRING matches schema
            },
          });
        }

        created++;
      } catch (err: any) {
        failed++;
        errors.push({
          row: i + 1,
          message: err.message || "Unknown error",
        });
      }
    }

    return res.json({
      created,
      failed,
      errors,
    });
  }
);

export default router;