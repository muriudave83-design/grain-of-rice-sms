import { Router } from "express";
import { prisma } from "../prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";

const router = Router();

/**
 * 📘 Get teacher assignments (subjects + classes)
 */
router.get(
  "/teacher/assignments",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req: any, res) => {
    try {
      const teacherId = req.user?.id;

      const assignments = await prisma.teacherSubject.findMany({
        where: {
          teacherId: teacherId,
        },
        include: {
          subject: true,
          class: true,
        },
      });

      return res.status(200).json(assignments);
    } catch (error) {
      console.error("Error fetching teacher assignments:", error);

      return res.status(500).json({
        error: "Failed to fetch teacher assignments",
      });
    }
  }
);

/**
 * 🏫 Get unique classes for a teacher
 */
router.get(
  "/teacher/classes",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req: any, res) => {
    try {
      const teacherId = req.user?.id;

      const teacherSubjects = await prisma.teacherSubject.findMany({
        where: {
          teacherId: teacherId,
        },
        include: {
          class: true,
        },
      });

      const uniqueClassesMap = new Map<number, any>();

      teacherSubjects.forEach((ts) => {
        if (ts.class) {
          uniqueClassesMap.set(ts.class.id, ts.class);
        }
      });

      const classes = Array.from(uniqueClassesMap.values());

      return res.status(200).json(classes);
    } catch (error) {
      console.error("Error fetching teacher classes:", error);

      return res.status(500).json({
        error: "Failed to fetch teacher classes",
      });
    }
  }
);

/**
 * 👨‍🎓 Get students in a class (for teacher)
 */
router.get(
  "/teacher/class/:id/students",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req: any, res) => {
    try {
      const classId = Number(req.params.id);

      const students = await prisma.student.findMany({
        where: {
          classId: classId,
          isArchived: false,
        },
      });

      return res.status(200).json(students);
    } catch (error) {
      console.error("Error fetching class students:", error);

      return res.status(200).json([]);
    }
  }
);

/**
 * 📊 Get student gradebook (assignments + scores)
 */
router.get(
  "/teacher/student/:id/gradebook",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req: any, res) => {
    try {
      const studentId = Number(req.params.id);

      const scores = await prisma.assessmentScore.findMany({
        where: {
          studentId: studentId,
        },
        include: {
          assessment: true,
        },
      });

      const result = scores.map((s) => ({
        title: s.assessment.title,
        score: s.score,
      }));

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching gradebook:", error);

      return res.status(200).json([]);
    }
  }
);

export default router;