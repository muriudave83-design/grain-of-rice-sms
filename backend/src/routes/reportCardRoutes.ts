import { Router } from "express";
import { prisma } from "../prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";

// ✅ CONTROLLER IMPORT
import {
  getParentReportCards,
} from "../controllers/reportCard.controller";

const router = Router();

/**
 * ============================================================
 * HELPER — GRADE CALCULATOR
 * ============================================================
 */
function getGrade(avg: number) {
  if (avg >= 0.8) return "A";
  if (avg >= 0.7) return "B";
  if (avg >= 0.6) return "C";
  if (avg >= 0.5) return "D";
  return "E";
}

/**
 * ============================================================
 * 🚀 NEW — GENERATE REPORT CARD (DYNAMIC)
 * GET /api/report-cards/generate/:studentId
 * ============================================================
 */
router.get(
  "/generate/:studentId",
  authenticate,
  async (req, res) => {
    try {
      const studentId = Number(req.params.studentId);

      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Subjects in class
      const classSubjects = await prisma.classSubject.findMany({
        where: { classId: student.classId },
        include: { subject: true },
      });

      const categories = await prisma.assignmentCategory.findMany();

      const results = [];
      let overallTotal = 0;
      let subjectCount = 0;

      for (const cs of classSubjects) {
        const assessments = await prisma.assessment.findMany({
          where: {
            subjectId: cs.subjectId,
            classId: student.classId,
          },
          select: {
            id: true,
            maxScore: true,
            categoryId: true,
          },
        });

        if (assessments.length === 0) continue;

        const scores = await prisma.assessmentScore.findMany({
          where: {
            studentId,
            assessmentId: {
              in: assessments.map((a) => a.id),
            },
          },
        });

        const scoreMap: Record<number, number> = {};
        scores.forEach((s) => {
          scoreMap[s.assessmentId] = s.score;
        });

        const categoryBuckets: Record<number, number[]> = {};

        // Normalize + group
        for (const a of assessments) {
          const score = scoreMap[a.id];

          if (score != null && a.categoryId && a.maxScore > 0) {
            const value = score / a.maxScore;

            if (!categoryBuckets[a.categoryId]) {
              categoryBuckets[a.categoryId] = [];
            }

            categoryBuckets[a.categoryId].push(value);
          }
        }

        // Weighted calculation
        let weightedTotal = 0;

        for (const category of categories) {
          const values = categoryBuckets[category.id] || [];
          const weight = (category.weight ?? 0) / 100;

          if (!weight) continue;

          let categoryAverage = 0;

          if (values.length > 0) {
            categoryAverage =
              values.reduce((a, b) => a + b, 0) / values.length;
          }

          weightedTotal += categoryAverage * weight;
        }

        if (weightedTotal === 0) continue;

        overallTotal += weightedTotal;
        subjectCount++;

        results.push({
          subject: cs.subject.name,
          average: Number((weightedTotal * 100).toFixed(2)),
          grade: getGrade(weightedTotal),
        });
      }

      const overallAverage =
        subjectCount > 0 ? overallTotal / subjectCount : 0;

      res.json({
        student,
        results,
        overallAverage: Number((overallAverage * 100).toFixed(2)),
        overallGrade: getGrade(overallAverage),
      });

    } catch (err) {
      console.error("Report card generation failed:", err);
      res.status(500).json({
        message: "Failed to generate report card",
      });
    }
  }
);

/**
 * ============================================================
 * STUDENT — GET MY REPORT CARDS
 * ============================================================
 */
router.get(
  "/me",
  authenticate,
  requireRole([Role.STUDENT]),
  async (req, res) => {
    const user = req.user;

    if (!user?.studentId) {
      return res.status(400).json({
        message: "Student account not linked",
      });
    }

    const reportCards = await prisma.reportCard.findMany({
      where: {
        studentId: user.studentId,
        status: "PUBLISHED",
      },
      include: {
        class: true,
        term: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
    });

    res.json(reportCards);
  }
);

/**
 * ============================================================
 * PARENT — GET REPORT CARDS
 * ============================================================
 */
router.get(
  "/parent",
  authenticate,
  requireRole([Role.PARENT]),
  getParentReportCards
);

/**
 * ============================================================
 * 👨‍🏫 TEACHER — CLASS REPORT CARDS (DYNAMIC)
 * GET /api/teacher/report-cards/:classId/:term
 * ============================================================
 */
router.get(
  "/teacher/report-cards/:classId/:term",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    try {
      const classId = Number(req.params.classId);

      const students = await prisma.student.findMany({
        where: { classId },
      });

      const classSubjects = await prisma.classSubject.findMany({
        where: { classId },
        include: { subject: true },
      });

      const categories = await prisma.assignmentCategory.findMany();

      const results = [];

      for (const student of students) {
        let overallTotal = 0;
        let subjectCount = 0;
        const subjects = [];

        for (const cs of classSubjects) {
          const assessments = await prisma.assessment.findMany({
            where: {
              subjectId: cs.subjectId,
              classId,
            },
            select: {
              id: true,
              maxScore: true,
              categoryId: true,
            },
          });

          if (!assessments.length) continue;

          const scores = await prisma.assessmentScore.findMany({
            where: {
              studentId: student.id,
              assessmentId: {
                in: assessments.map((a) => a.id),
              },
            },
          });

          const scoreMap: Record<number, number> = {};
          scores.forEach((s) => {
            scoreMap[s.assessmentId] = s.score;
          });

          const categoryBuckets: Record<number, number[]> = {};

          for (const a of assessments) {
            const score = scoreMap[a.id];

            if (score != null && a.categoryId && a.maxScore > 0) {
              const value = score / a.maxScore;

              if (!categoryBuckets[a.categoryId]) {
                categoryBuckets[a.categoryId] = [];
              }

              categoryBuckets[a.categoryId].push(value);
            }
          }

          let weightedTotal = 0;

          for (const category of categories) {
            const values = categoryBuckets[category.id] || [];
            const weight = (category.weight ?? 0) / 100;

            if (!weight) continue;

            let categoryAverage = 0;

            if (values.length > 0) {
              categoryAverage =
                values.reduce((a, b) => a + b, 0) / values.length;
            }

            weightedTotal += categoryAverage * weight;
          }

          if (weightedTotal === 0) continue;

          overallTotal += weightedTotal;
          subjectCount++;

          subjects.push({
            subject: cs.subject.name,
            average: Number((weightedTotal * 100).toFixed(2)),
            grade: getGrade(weightedTotal),
          });
        }

        const overallAverage =
          subjectCount > 0 ? overallTotal / subjectCount : 0;

        results.push({
          studentId: student.id,
          name: `${student.firstName} ${student.lastName}`,
          subjects,
          overallAverage: Number((overallAverage * 100).toFixed(2)),
          overallGrade: getGrade(overallAverage),
        });
      }

      res.json(results);
    } catch (err) {
      console.error("Teacher report cards failed:", err);
      res.status(500).json({
        message: "Failed to load class report cards",
      });
    }
  }
);

/**
 * ============================================================
 * READ — GET SINGLE REPORT CARD
 * ============================================================
 */
router.get(
  "/:id",
  authenticate,
  async (req, res) => {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid report card id",
      });
    }

    const reportCard = await prisma.reportCard.findUnique({
      where: { id },
      include: {
        student: true,
        class: true,
        term: true,
      },
    });

    if (!reportCard) {
      return res.status(404).json({
        message: "Report card not found",
      });
    }

    if (
      reportCard.status !== "PUBLISHED" &&
      req.user?.role !== Role.ADMIN
    ) {
      return res.status(403).json({
        message: "You are not authorized to view this report card",
      });
    }

    if (req.user?.role === Role.PARENT) {
      const parentStudent = await prisma.parentStudent.findFirst({
        where: {
          parentId: req.user.id,
          studentId: reportCard.studentId,
        },
      });

      if (!parentStudent) {
        return res.status(403).json({
          message: "You are not authorized to view this report card",
        });
      }
    }

    res.json(reportCard);
  }
);

export { router as reportCardReadRoutes };