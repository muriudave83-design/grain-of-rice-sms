import { Router } from "express";
import { prisma } from "../../prisma/client";

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
      },
      orderBy: { id: "asc" },
    });

    // Flatten parent for easier frontend use
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
 * Create a new student
 */
router.post("/students", async (req, res) => {
  console.log("🔥 ADMIN STUDENTS ROUTE HIT");

  try {
    let { firstName, lastName, admissionNo, classId, parentId } = req.body;

    // Normalize values
    firstName = firstName?.trim();
    lastName = lastName?.trim();
    admissionNo = admissionNo?.trim();
    classId = Number(classId);
    parentId = parentId ? Number(parentId) : null;

    if (
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof admissionNo !== "string" ||
      isNaN(classId)
    ) {
      return res.status(400).json({
        message: "Invalid or missing fields",
        received: req.body,
      });
    }

    // Verify class exists
    const classExists = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classExists) {
      return res.status(404).json({ message: "Class not found." });
    }

    // Create student
    const student = await prisma.student.create({
      data: {
        firstName,
        lastName,
        admissionNo,
        classId,
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

    res.json(student);
  } catch (err) {
    console.error("Create student error:", err);
    res.status(500).json({ message: "Failed to create student." });
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