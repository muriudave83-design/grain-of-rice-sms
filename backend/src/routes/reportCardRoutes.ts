console.log("🔥 reportCardRoutes.ts LOADED");

import { Router } from "express";
import { prisma } from "../prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
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
 * 🚀 GENERATE REPORT CARD
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

        if (!assessments.length) continue;

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
 * 👨‍🏫 TEACHER + 🎓 STUDENT — REPORT CARDS
 * ============================================================
 */
router.get(
  "/teacher/:classId/:term",
  authenticate,
  async (req: any, res) => {
    console.log("🔥 REPORT CARD ROUTE HIT");

    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log("USER:", req.user);

      let classId = Number(req.params.classId);
      const userId = req.user.id;
      const role = req.user.role;

      let students;

      if (role === Role.STUDENT) {
        const student = await prisma.student.findFirst({
          where: { userId },
        });

        if (!student) {
          return res.status(403).json({
            message: "No student profile linked",
          });
        }
        
        classId = student.classId;
        students = [student];
      } else {
        students = await prisma.student.findMany({
          where: { classId },
        });
      }

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

      if (role === Role.STUDENT) {
        return res.json(results[0] || null);
      }

      res.json(results);

    } catch (err) {
      console.error("🔥 REAL ERROR:", err);
      res.status(500).json({
        message: "Failed to load report cards",
        error: err instanceof Error ? err.message : err,
      });
    }
  }
);

export { router as reportCardReadRoutes };