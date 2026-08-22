// ============================================================
// src/routes/reportCardRoutes.ts
// PART 1
// ============================================================

console.log("🔥 reportCardRoutes.ts LOADED");

import { Router } from "express";
import { getGradeDescription, getLetterGrade, normalizeGradePercentage } from "../utils/gradeDescriptions";
import { prisma } from "../prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";
import { ReportCardStatus } from "@prisma/client";

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
  return getLetterGrade(normalizeGradePercentage(avg)) ?? "F";
}

/**
 * ============================================================
 * 🎓 STUDENT / 👨‍👩‍👧 PARENT — OWN REPORT CARD (/me)
 * ============================================================
 * FIX:
 * ❌ removed inline role checks
 * ✅ replaced with requireRole middleware
 */
router.get(
  "/me",
  authenticate,
  requireRole([Role.STUDENT, Role.PARENT, Role.ADMIN]),
  async (req: any, res) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // ================================
      // PARENT FLOW
      // ================================
      if (user.role === Role.PARENT) {
        const children = await prisma.student.findMany({
          where: {
            parentLinks: {
              some: {
                parentId: user.id,
              },
            },
          },
        });

        if (!children.length) {
          return res.json([]);
        }

        const results = children.map((child) => ({
          studentId: child.id,
          name: `${child.firstName} ${child.lastName}`,
          subjects: [],
          overallAverage: 0,
          overallGrade: "N/A",
        }));

        return res.json(results);
      }

      // ================================
      // STUDENT FLOW
      // ================================
      let termId: number | undefined;

      if (req.query.term) {
        const termMap: Record<string, number> = {
          term1: 1,
          term2: 2,
          term3: 3,
        };

        termId = termMap[String(req.query.term).toLowerCase()];
      } else if (req.query.termId) {
        termId = Number(req.query.termId);
      }

      console.log("📘 TERM FILTER:", termId);

      const student = await prisma.student.findFirst({
        where: { userId: user.id },
      });

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const classId = student.classId;

      const classSubjects = await prisma.classSubject.findMany({
        where: { classId },
        include: { subject: true },
      });

      const categories = await prisma.assignmentCategory.findMany();

      let overallTotal = 0;
      let subjectCount = 0;
      const subjects = [];

      for (const cs of classSubjects) {
        const assessments = await prisma.assessment.findMany({
          where: {
            subjectId: cs.subjectId,
            classId,
            ...(termId && { termId }),
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

        // ====================================================
        // ✅ FIXED WEIGHT NORMALIZATION
        // ====================================================

        let weightedTotal = 0;
        let activeWeightTotal = 0;

        for (const category of categories) {
          const values = categoryBuckets[category.id] || [];
          const weight = (category.weight ?? 0) / 100;

          if (!weight) continue;

          // ✅ Ignore empty categories completely
          if (values.length === 0) {
            continue;
          }

          const categoryAverage =
            values.reduce((a, b) => a + b, 0) / values.length;

          weightedTotal += categoryAverage * weight;
          activeWeightTotal += weight;
        }

        // ✅ No active grades at all
        if (activeWeightTotal === 0) continue;

        // ✅ Normalize active weights only
        const normalizedAverage =
          weightedTotal / activeWeightTotal;

        overallTotal += normalizedAverage;
        subjectCount++;

        subjects.push({
          subject: cs.subject.name,
          average: Number(
            (normalizedAverage * 100).toFixed(2)
          ),
          grade: getGrade(normalizedAverage),
          gradeDescription: getGradeDescription(getGrade(normalizedAverage)),
        });
      }

      const overallAverage =
        subjectCount > 0 ? overallTotal / subjectCount : 0;

      return res.json({
        studentId: student.id,
        name: `${student.firstName} ${student.lastName}`,
        subjects,
        overallAverage: Number(
          (overallAverage * 100).toFixed(2)
        ),
        overallGrade: getGrade(overallAverage),
        overallGradeDescription: getGradeDescription(getGrade(overallAverage)),
      });

    } catch (err) {
      console.error("❌ /me route error:", err);

      res.status(500).json({
        message: "Failed to load student report card",
      });
    }
  }
);

// ============================================================
// 👨‍👩‍👧 PARENT — VIEW SINGLE REPORT CARD
// ============================================================

router.get(
  "/student/:studentId/term/:termId",
  authenticate,
  requireRole([Role.PARENT, Role.ADMIN]),
  async (req: any, res) => {
    try {
      const studentId = Number(req.params.studentId);
      const termId = Number(req.params.termId);

      if (!req.user) {
        return res.status(401).json({
          message: "Unauthorized",
        });
      }

      // ========================================================
      // 🔐 PARENT OWNERSHIP CHECK
      // ========================================================

      if (req.user.role === Role.PARENT) {
        const link = await prisma.parentStudent.findFirst({
          where: {
            parentId: req.user.id,
            studentId,
          },
        });

        if (!link) {
          return res.status(403).json({
            message: "Not authorized",
          });
        }
      }

      // ========================================================
      // 📊 FETCH REPORT CARD
      // ========================================================

      const reportCard = await prisma.reportCard.findFirst({
        where: {
          studentId,
          termId,
          status: ReportCardStatus.PUBLISHED,
        },
        include: {
          student: true,
          term: true,
          class: true,
          subjects: {
            include: {
              subject: true,
            },
          },
        },
      });

            if (!reportCard) {
        return res.status(404).json({
          message: "Report card not found",
        });
      }

      return res.json(reportCard);

    } catch (err) {
      console.error("❌ Parent report card error:", err);

      res.status(500).json({
        message: "Failed to load report card",
      });
    }
  }
);

// ============================================================
// 🚀 GENERATE REPORT CARD (SECURED)
// ============================================================

router.get(
  "/generate/:studentId",
  authenticate,
  requireRole([Role.TEACHER, Role.ADMIN]),
  async (req, res) => {
    try {
      const studentId = Number(req.params.studentId);

      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        return res.status(404).json({
          error: "Student not found",
        });
      }

      if (req.user!.role === Role.TEACHER) {
        const assigned = await prisma.teacherSubject.findFirst({
          where: { teacherId: req.user!.id, classId: student.classId, isActive: true },
          select: { id: true },
        });
        if (!assigned) return res.status(403).json({ message: "Active teacher assignment required" });
      }

      const classSubjects =
        await prisma.classSubject.findMany({
          where: {
            classId: student.classId,
          },
          include: {
            subject: true,
          },
        });

      const categories =
        await prisma.assignmentCategory.findMany();

      const results = [];

      let overallTotal = 0;
      let subjectCount = 0;

      for (const cs of classSubjects) {
        const assessments =
          await prisma.assessment.findMany({
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

        const scores =
          await prisma.assessmentScore.findMany({
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

        const categoryBuckets:
          Record<number, number[]> = {};

        for (const a of assessments) {
          const score = scoreMap[a.id];

          if (
            score != null &&
            a.categoryId &&
            a.maxScore > 0
          ) {
            const value = score / a.maxScore;

            if (!categoryBuckets[a.categoryId]) {
              categoryBuckets[a.categoryId] = [];
            }

            categoryBuckets[a.categoryId].push(value);
          }
        }

        // ====================================================
        // ✅ FIXED WEIGHT NORMALIZATION
        // ====================================================

        let weightedTotal = 0;
        let activeWeightTotal = 0;

        for (const category of categories) {
          const values =
            categoryBuckets[category.id] || [];

          const weight =
            (category.weight ?? 0) / 100;

          if (!weight) continue;

          // ✅ Ignore missing categories
          if (values.length === 0) {
            continue;
          }

          const categoryAverage =
            values.reduce((a, b) => a + b, 0) /
            values.length;

          weightedTotal +=
            categoryAverage * weight;

          activeWeightTotal += weight;
        }

        // ✅ No graded work
        if (activeWeightTotal === 0) continue;

        // ✅ Normalize only active categories
        const normalizedAverage =
          weightedTotal / activeWeightTotal;

        overallTotal += normalizedAverage;

        subjectCount++;

        results.push({
          subject: cs.subject.name,

          average: Number(
            (normalizedAverage * 100).toFixed(2)
          ),

          grade: getGrade(normalizedAverage),
          gradeDescription: getGradeDescription(getGrade(normalizedAverage)),
        });
      }

      const overallAverage =
        subjectCount > 0
          ? overallTotal / subjectCount
          : 0;

      res.json({
        student,
        results,

        overallAverage: Number(
          (overallAverage * 100).toFixed(2)
        ),

        overallGrade: getGrade(overallAverage),
        overallGradeDescription: getGradeDescription(getGrade(overallAverage)),
      });

    } catch (err) {
      console.error(
        "Report card generation failed:",
        err
      );

      res.status(500).json({
        message: "Failed to generate report card",
      });
    }
  }
);

// ============================================================
// 👨‍🏫 TEACHER + 🎓 STUDENT — REPORT CARDS BY CLASS
// ============================================================

router.get(
  "/by-class/:classId/term/:term",
  authenticate,
  requireRole([
    Role.TEACHER,
    Role.ADMIN,
    Role.STUDENT,
  ]),
  async (req: any, res) => {
    console.log("🔥 REPORT CARD ROUTE HIT");

    try {
      if (!req.user) {
        return res.status(401).json({
          message: "Unauthorized",
        });
      }

      console.log("USER:", req.user);

      let classIdParam = req.params.classId;

      let classId = classIdParam
        ? Number(classIdParam)
        : undefined;

      const userId = req.user.id;
      const role = req.user.role;

      let students;

      // ========================================================
      // 🎓 STUDENT FLOW
      // ========================================================

      if (role === Role.STUDENT) {
        const student =
          await prisma.student.findFirst({
            where: { userId },
          });

        if (!student) {
          return res.status(403).json({
            message:
              "No student profile linked",
          });
        }

        classId = student.classId;

        students = [student];
      }

      // ========================================================
      // 👨‍🏫 TEACHER / ADMIN FLOW
      // ========================================================

      else {
        if (!classId || isNaN(classId)) {
          return res.status(400).json({
            message:
              "Valid classId is required",
          });
        }

        if (role === Role.TEACHER) {
          const assigned = await prisma.teacherSubject.findFirst({
            where: { teacherId: userId, classId, isActive: true },
            select: { id: true },
          });
          if (!assigned) return res.status(403).json({ message: "Active teacher assignment required" });
        }

        students = await prisma.student.findMany({
          where: { classId },
        });
      }

      const classSubjects =
        await prisma.classSubject.findMany({
          where: { classId },
          include: {
            subject: true,
          },
        });

      const categories =
        await prisma.assignmentCategory.findMany();

      const results = [];

      for (const student of students) {
        let overallTotal = 0;
        let subjectCount = 0;

        const subjects = [];

        for (const cs of classSubjects) {
          const assessments =
            await prisma.assessment.findMany({
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

          const scores =
            await prisma.assessmentScore.findMany({
              where: {
                studentId: student.id,
                assessmentId: {
                  in: assessments.map(
                    (a) => a.id
                  ),
                },
              },
            });

          const scoreMap: Record<number, number> = {};

          scores.forEach((s) => {
            scoreMap[s.assessmentId] = s.score;
          });

          const categoryBuckets:
            Record<number, number[]> = {};

          for (const a of assessments) {
            const score = scoreMap[a.id];

            if (
              score != null &&
              a.categoryId &&
              a.maxScore > 0
            ) {
              const value = score / a.maxScore;

              if (!categoryBuckets[a.categoryId]) {
                categoryBuckets[a.categoryId] = [];
              }

              categoryBuckets[a.categoryId].push(value);
            }
          }

          // ====================================================
          // ✅ FIXED WEIGHT NORMALIZATION
          // ====================================================

          let weightedTotal = 0;
          let activeWeightTotal = 0;

          for (const category of categories) {
            const values =
              categoryBuckets[category.id] || [];

            const weight =
              (category.weight ?? 0) / 100;

            if (!weight) continue;

            // ✅ Ignore empty categories completely
            if (values.length === 0) {
              continue;
            }

            const categoryAverage =
              values.reduce((a, b) => a + b, 0) /
              values.length;

            weightedTotal +=
              categoryAverage * weight;

            activeWeightTotal += weight;
          }

          // ✅ No graded categories
          if (activeWeightTotal === 0) continue;

          // ✅ Normalize active weights only
          const normalizedAverage =
            weightedTotal / activeWeightTotal;

          overallTotal += normalizedAverage;

          subjectCount++;

          subjects.push({
            subject: cs.subject.name,

            average: Number(
              (normalizedAverage * 100).toFixed(2)
            ),

            grade: getGrade(normalizedAverage),
            gradeDescription: getGradeDescription(getGrade(normalizedAverage)),
          });
        }

        const overallAverage =
          subjectCount > 0
            ? overallTotal / subjectCount
            : 0;

        results.push({
          studentId: student.id,

          name: `${student.firstName} ${student.lastName}`,

          subjects,

          overallAverage: Number(
            (overallAverage * 100).toFixed(2)
          ),

          overallGrade: getGrade(overallAverage),
          overallGradeDescription: getGradeDescription(getGrade(overallAverage)),
        });
      }

      // ========================================================
      // 🎯 RESPONSE SHAPE CONTROL
      // ========================================================

      if (role === Role.STUDENT) {
        return res.json(results[0] || null);
      }

      return res.json(results);

    } catch (err) {
      console.error("🔥 REAL ERROR:", err);

      res.status(500).json({
        message: "Failed to load report cards",
        error:
          err instanceof Error
            ? err.message
            : err,
      });
    }
  }
);

// ============================================================
// 👨‍👩‍👧 PARENT REPORT CARD CONTROLLER ROUTE
// ============================================================

router.get(
  "/parent",
  authenticate,
  requireRole([Role.PARENT]),
  getParentReportCards
);

export default router;
