import { Router } from "express";
console.log("🔥 ADMIN.STUDENTS.ROUTES FILE LOADED");

import { prisma } from "../../prisma/client";
import bcrypt from "bcryptjs";

const router = Router();

/**
 * ✅ GET ACTIVE STUDENTS
 * GET /api/admin/students
 */
router.get("/students", async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where: {
        isArchived: false,
      },
      include: {
        class: true,
        parentLinks: {
          include: {
            parent: true,
          },
        },
        user: true,
      },
      orderBy: { id: "asc" },
    });

    const result = students.map((s) => ({
      ...s,
      parent: s.parentLinks[0]?.parent || null,
    }));

    res.json(result);
  } catch (err) {
    console.error("Failed to fetch students:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

/**
 * ✅ NEW — GET SINGLE STUDENT (FIXED FOR PRISMA)
 * GET /api/admin/students/:id
 */
router.get("/students/:id", async (req, res) => {
  const id = Number(req.params.id);

  try {
    const student = await prisma.student.findFirst({
      where: {
        id,
        isArchived: false,
      },
      include: {
        class: true,
        parentLinks: {
          include: {
            parent: true,
          },
        },
        user: true,
      },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const result = {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      admissionNo: student.admissionNo,
      className: student.class?.name || "—",
      parent: student.parentLinks[0]?.parent || null,
    };

    res.json(result);
  } catch (err) {
    console.error("Fetch single student error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ✅ GET ARCHIVED STUDENTS (FIXED ROUTE)
 * GET /api/admin/archived/students
 */
router.get("/archived/students", async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where: {
        isArchived: true,
      },
      include: {
        class: true,
        parentLinks: {
          include: {
            parent: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    const result = students.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`, // ✅ FIXED NAME
      admissionNo: s.admissionNo,
      className: s.class?.name || "—", // ✅ FIXED CLASS
      parent: s.parentLinks[0]?.parent || null,
    }));

    res.json(result);
  } catch (err) {
    console.error("Failed to fetch archived students:", err);
    res.status(500).json({ message: "Failed to fetch archived students" });
  }
});

/**
 * ✅ CREATE STUDENT
 * POST /api/admin/students
 */
router.post("/students", async (req, res) => {
  console.log("🔥 ADMIN STUDENTS ROUTE HIT");

  try {
    let { firstName, lastName, admissionNo, classId, parentId } = req.body;

    firstName = firstName?.trim();
    lastName = lastName?.trim();
    admissionNo = admissionNo?.trim();
    classId = Number(classId);
    parentId = parentId ? Number(parentId) : null;

    if (
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof admissionNo !== "string" ||
      Number.isNaN(classId)
    ) {
      return res.status(400).json({
        message: "Invalid or missing fields",
      });
    }

    const classExists = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classExists) {
      return res.status(404).json({ message: "Class not found." });
    }

    const existingStudent = await prisma.student.findUnique({
      where: { admissionNo },
    });

    if (existingStudent) {
      return res.status(409).json({
        message: "Student with this admission number already exists.",
      });
    }

    const email = `${admissionNo.toLowerCase()}@student.school.com`;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Generated email already exists.",
      });
    }

    const defaultPassword = "student123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "STUDENT",
        name: `${firstName} ${lastName}`,
      },
    });

    const student = await prisma.student.create({
      data: {
        firstName,
        lastName,
        admissionNo,
        classId,
        userId: user.id,
      },
    });

    if (parentId) {
      await prisma.parentStudent.create({
        data: {
          parentId,
          studentId: student.id,
        },
      });
    }

    res.json({
      message: "Student and login account created successfully.",
      student,
      login: {
        email,
        password: defaultPassword,
      },
    });

  } catch (err: any) {
    console.error("Create student error:", err);

    if (err.code === "P2002") {
      return res.status(409).json({
        message: "Duplicate field detected.",
      });
    }

    res.status(500).json({
      message: "Failed to create student.",
    });
  }
});

/**
 * ✅ UPDATE STUDENT (FIXED — WITH PARENT LINKING)
 * PUT /api/admin/students/:id
 */
router.put("/students/:id", async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, admissionNo, classId, parentId } = req.body;

  try {
    const studentId = Number(id);

    // ✅ 1. Update student basic info
    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        firstName,
        lastName,
        admissionNo,
        classId: classId ? Number(classId) : undefined,
      },
    });

    // ✅ 2. HANDLE PARENT RELATION (CRITICAL FIX)

    // Remove existing parent links
    await prisma.parentStudent.deleteMany({
      where: { studentId },
    });

    // Add new parent if provided
    if (parentId) {
      await prisma.parentStudent.create({
        data: {
          studentId,
          parentId: String(parentId),
        },
      });
    }

    res.json(updated);
  } catch (err) {
    console.error("Update student error:", err);
    res.status(500).json({ message: "Failed to update student" });
  }
});
/**
 * ✅ ARCHIVE STUDENT (DELETE)
 * DELETE /api/admin/students/:id
 */
router.delete("/students/:id", async (req, res) => {
  try {
    await prisma.student.update({
      where: { id: Number(req.params.id) },
      data: { isArchived: true },
    });

    res.json({ message: "Student archived successfully" });
  } catch (err) {
    console.error("Archive failed:", err);
    res.status(500).json({ error: "Failed to archive student" });
  }
});

/**
 * ✅ RESTORE STUDENT
 * PUT /api/admin/students/:id/restore
 */
router.put("/students/:id/restore", async (req, res) => {
  try {
    await prisma.student.update({
      where: { id: Number(req.params.id) },
      data: { isArchived: false },
    });

    res.json({ message: "Student restored" });
  } catch (err) {
    console.error("Restore failed:", err);
    res.status(500).json({ error: "Restore failed" });
  }
});

/**
 * LINK USER
 */
router.post("/students/:studentId/link-user", async (req, res) => {
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
    return res
      .status(400)
      .json({ message: "User must exist and have STUDENT role" });
  }

  if (student.userId) {
    return res
      .status(409)
      .json({ message: "Student already linked to a user" });
  }

  await prisma.student.update({
    where: { id: studentId },
    data: { userId: user.id },
  });

  res.json({ message: "Student successfully linked to user" });
});

// ===============================
// TEACHERS ARCHIVE (SAFE ADD)
// ===============================

// Archive teacher
router.delete("/teachers/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.user.update({
      where: { id },
      data: { isArchived: true },
    });

    res.json({ message: "Teacher archived" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to archive teacher" });
  }
});

// Get archived teachers
router.get("/archived/teachers", async (req, res) => {
  try {
    const teachers = await prisma.user.findMany({
      where: {
        role: "TEACHER",
        isArchived: true,
      },
    });

    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch teachers" });
  }
});

// Restore teacher
router.put("/teachers/:id/restore", async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.user.update({
      where: { id },
      data: { isArchived: false },
    });

    res.json({ message: "Teacher restored" });
  } catch (error) {
    res.status(500).json({ message: "Failed to restore teacher" });
  }
});

// ===============================
// PARENTS ARCHIVE (SAFE ADD)
// ===============================

// Archive parent
router.delete("/parents/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.user.update({
      where: { id },
      data: { isArchived: true },
    });

    res.json({ message: "Parent archived" });
  } catch (error) {
    res.status(500).json({ message: "Failed to archive parent" });
  }
});

// Get archived parents
router.get("/archived/parents", async (req, res) => {
  try {
    const parents = await prisma.user.findMany({
      where: {
        role: "PARENT",
        isArchived: true,
      },
    });

    res.json(parents);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch parents" });
  }
});

// Restore parent
router.put("/parents/:id/restore", async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.user.update({
      where: { id },
      data: { isArchived: false },
    });

    res.json({ message: "Parent restored" });
  } catch (error) {
    res.status(500).json({ message: "Failed to restore parent" });
  }
});

export default router;
