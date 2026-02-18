import { Router } from "express";
import { prisma } from "../../prisma/client";

const router = Router();

/**
 * GET /api/admin/classes/:classId/students
 * Returns all students in a specific class
 */
router.get("/classes/:classId/students", async (req, res) => {
  const classId = Number(req.params.classId);

  if (Number.isNaN(classId)) {
    return res.status(400).json({ message: "Invalid classId" });
  }

  try {
    const students = await prisma.student.findMany({
      where: { classId },
      orderBy: { firstName: "asc" },
      include: {
        class: true,
        parentLinks: {
          include: { parent: true },
        },
      },
    });

    res.json(students);
  } catch (err) {
    console.error("Failed to fetch class students:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

export default router;
