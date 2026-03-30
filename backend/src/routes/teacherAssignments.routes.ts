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

      // ✅ Extract unique classes safely
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

export default router;