import { Router } from "express";
console.log("🔥 ADMIN.STUDENTS.ROUTES FILE LOADED");

import { prisma } from "../../prisma/client";
import bcrypt from "bcryptjs";

const router = Router();

/**
 * GET /api/admin/students
 * List all students with class + parent
 */
router.get("/students", async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        class: true,
        parentLinks: {
          include: {
            parent: true,
          },
        },
        user: true, // include linked login
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
 * POST /api/admin/students
 * Create student + auto-create login account
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

    // Ensure class exists
    const classExists = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classExists) {
      return res.status(404).json({ message: "Class not found." });
    }

    // Prevent duplicate admission numbers
    const existingStudent = await prisma.student.findUnique({
      where: { admissionNo },
    });

    if (existingStudent) {
      return res.status(409).json({
        message: "Student with this admission number already exists.",
      });
    }

    // Generate student email
    const email = `${admissionNo.toLowerCase()}@student.school.com`;

    // Check duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Generated email already exists.",
      });
    }

    // Default password (force change later if desired)
    const defaultPassword = "student123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create login user first
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "STUDENT",
        name: `${firstName} ${lastName}`,
      },
    });

    // Create student linked to user
    const student = await prisma.student.create({
      data: {
        firstName,
        lastName,
        admissionNo,
        classId,
        userId: user.id,
      },
    });

    // Link parent if provided
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
 * POST /api/admin/students/:studentId/link-user
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

export default router;