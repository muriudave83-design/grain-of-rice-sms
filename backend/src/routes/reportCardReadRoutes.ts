import { Router } from "express";
import { prisma } from "../prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";

const router = Router();

/**
 * ============================================================
 * TEACHER — COMPUTED REPORT CARDS (🔥 FIXED ENGINE)
 * GET /api/report-cards/teacher/:classId/:term
 * ============================================================
 */
router.get(
  "/teacher/:classId/:term",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    console.log("🔥 NEW REPORT LOGIC RUNNING");
    console.log("PARAMS:", req.params);

    try {
      const classId = Number(req.params.classId);

      const termParam = req.params.term;
      if (Array.isArray(termParam)) {
        return res.status(400).json({ message: "Invalid term parameter" });
      }

      const termName = termParam;

      if (Number.isNaN(classId)) {
        return res.status(400).json({ message: "Invalid classId" });
      }

      // 🔍 Find term
      const term = await prisma.term.findFirst({
        where: {
          name: {
            contains: termName,
            mode: "insensitive",
          },
        },
      });

      if (!term) {
        return res.status(404).json({ message: "Term not found" });
      }

      // ✅ Get students
      const students = await prisma.student.findMany({
        where: { classId },
        include: { user: true },
      });

      // ✅ Get assessments WITH SUBJECT + SCORES
      const assessments = await prisma.assessment.findMany({
        where: {
          classId,
          termId: term.id,
          status: "SUBMITTED", // 🔥 IMPORTANT
        },
        include: {
          subject: true,
          scores: true,
        },
      });

      // ✅ Compute report PROPERLY
      const report = students.map((student) => {
        const subjectMap: Record<string, { total: number; count: number }> = {};

        assessments.forEach((assessment) => {
          const score = assessment.scores.find(
            (s) => s.studentId === student.id
          );

          if (!score) return;

          const subjectName = assessment.subjectId.toString();

          if (!subjectMap[subjectName]) {
            subjectMap[subjectName] = { total: 0, count: 0 };
          }

          subjectMap[subjectName].total += score.score;
          subjectMap[subjectName].count++;
        });

        const subjects = Object.entries(subjectMap).map(([subject, data]) => {
          const avg = data.count > 0 ? data.total / data.count : 0;

          return {
            subject,
            average: avg,
          };
        });

        const overallTotal = subjects.reduce((sum, s) => sum + s.average, 0);
        const overallAverage =
          subjects.length > 0 ? overallTotal / subjects.length : 0;

        return {
          studentId: student.id,
          name:
            student.user?.name ||
            `${student.firstName} ${student.lastName}`,
          subjects,
          overallAverage,
        };
      });

    } catch (err) {
      console.error("🔥 REPORT CARD ERROR:", err);
      res.status(500).json({ message: "Failed to load report cards" });
    }
  }
);
/**
 * ============================================================
 * STUDENT — VIEW OWN REPORT CARD (TERM)
 * GET /api/report-cards/me?termId=
 * ============================================================
 */
router.get(
  "/me",
  authenticate,
  requireRole([Role.STUDENT]),
  async (req, res) => {
    const user = req.user!;

    const student = await prisma.student.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ message: "Student record not found" });
    }

    const termIdRaw = req.query.termId;

    if (typeof termIdRaw !== "string") {
      return res.status(400).json({ message: "termId is required" });
    }

    const termId = Number(termIdRaw);

    if (Number.isNaN(termId)) {
      return res.status(400).json({ message: "Invalid termId" });
    }

    const reportCard = await prisma.reportCard.findUnique({
      where: {
        studentId_termId: {
          studentId: student.id,
          termId,
        },
      },
      include: {
        subjects: {
          include: { subject: true },
        },
        term: true,
        class: true,
      },
    });

    if (!reportCard || reportCard.status !== "PUBLISHED") {
      return res.status(404).json({
        message: "Report card not available",
      });
    }

    res.json(reportCard);
  }
);

/**
 * ============================================================
 * PARENT — VIEW CHILDREN REPORT CARDS
 * GET /api/report-cards/parent
 * ============================================================
 */
router.get(
  "/parent",
  authenticate,
  requireRole([Role.PARENT]),
  async (req, res) => {
    const parentId = req.user!.id;

    const links = await prisma.parentStudent.findMany({
      where: { parentId },
      select: { studentId: true },
    });

    if (links.length === 0) {
      return res.json([]);
    }

    const studentIds = links.map((l) => l.studentId);

    const reportCards = await prisma.reportCard.findMany({
      where: {
        studentId: { in: studentIds },
        status: "PUBLISHED",
      },
      include: {
        student: true,
        class: true,
        term: true,
      },
    });

    res.json(reportCards);
  }
);

/**
 * ============================================================
 * ADMIN / PARENT — VIEW REPORT CARD BY ID
 * GET /api/report-cards/:id
 * ============================================================
 */
router.get(
  "/:id",
  authenticate,
  requireRole([Role.ADMIN, Role.PARENT]),
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
        subjects: {
          include: { subject: true },
        },
        student: true,
        class: true,
        term: true,
      },
    });

    if (!reportCard || reportCard.status !== "PUBLISHED") {
      return res.status(404).json({
        message: "Report card not available",
      });
    }

    // 🔐 PARENT ACCESS GUARD
    if (req.user!.role === Role.PARENT) {
      const link = await prisma.parentStudent.findFirst({
        where: {
          parentId: req.user!.id,
          studentId: reportCard.studentId,
        },
      });

      if (!link) {
        return res.status(403).json({
          message: "You are not allowed to view this report card",
        });
      }
    }

    res.json(reportCard);
  }
);

export { router as reportCardReadRoutes };