// backend/src/routes/gradebookRoutes.ts
import { Router } from "express";
import { prisma } from "../prisma/client";
import {
  getTeacherGradebook,
  getParentGradebook,
  getAdminOverview,
} from "../controllers/gradebookController";
import { getGradebookGrid } from "../controllers/gradebookGrid.controller";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";

const router = Router();

// 🟢 Gradebook Grid (Teacher)
router.get(
  "/",
  authenticate,
  requireRole([Role.TEACHER]),
  getGradebookGrid
);

// 🟢 Save or update a score
router.post(
  "/score",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    try {
      const { assessmentId, studentId, score } = req.body;

      if (
        !assessmentId ||
        !studentId ||
        score === undefined ||
        score === null
      ) {
        return res.status(400).json({
          message: "assessmentId, studentId, and score required",
        });
      }

      const saved = await prisma.assessmentScore.upsert({
        where: {
          assessmentId_studentId: {
            assessmentId: Number(assessmentId),
            studentId: Number(studentId),
          },
        },
        update: {
          score: Number(score),
        },
        create: {
          assessmentId: Number(assessmentId),
          studentId: Number(studentId),
          score: Number(score),
        },
      });

      res.json(saved);
    } catch (err) {
      console.error("Failed to save score:", err);
      res.status(500).json({
        message: "Failed to save score",
      });
    }
  }
);

// Teacher summary view
router.get(
  "/teacher/subject/:subjectId",
  authenticate,
  requireRole([Role.TEACHER]),
  getTeacherGradebook
);

// Parent view for a student
router.get(
  "/parent/student/:studentId",
  authenticate,
  requireRole([Role.PARENT]),
  getParentGradebook
);

// Admin overview
router.get(
  "/admin/overview",
  authenticate,
  requireRole([Role.ADMIN]),
  getAdminOverview
);

export default router;
