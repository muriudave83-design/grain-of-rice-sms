import { Router } from "express";
import { prisma as basePrisma } from "../prisma/client";

// TEMP TYPE BRIDGE — runtime is correct
const prisma: any = basePrisma;

import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";
import { computeGradesForSubject } from "../services/grade.service";
import { createAssessment } from "../controllers/assessmentController";

const router = Router();

// ✅ VERY TOP — EXACT POSITION, EXACT STRING
console.log("✅ assessmentRoutes LOADED");

/**
 * ============================================================
 * 🟢 CREATE ASSESSMENT
 * POST /assessments
 * ============================================================
 */
router.post(
  "/",
  authenticate,
  requireRole([Role.TEACHER]),
  createAssessment
);

/**
 * ============================================================
 * 🟢 TEACHER OWNERSHIP ENDPOINT
 * GET /assessments/mine
 * ============================================================
 */
router.get(
  "/mine",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    const user = req.user!;

    const data = await prisma.assessment.findMany({
      where: {
        subject: {
          teacherId: user.id,
        },
      },
      include: {
        subject: true,
        class: true,
        term: true,
      },
      orderBy: { date: "desc" },
    });

    res.json(data);
  }
);

/**
 * ============================================================
 * 🟢 TEACHER — GET ALLOWED SUBJECTS FOR CLASS
 * GET /assessments/teacher/subjects?classId=1
 * ============================================================
 */
router.get(
  "/teacher/subjects",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    const teacherId = req.user!.id;
    const classId = Number(req.query.classId);

    if (!classId) {
      return res.status(400).json({ message: "classId is required" });
    }

    const subjects = await prisma.subject.findMany({
      where: {
        teacherId,
        classSubjects: {
          some: { classId },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json(subjects);
  }
);

/**
 * ============================================================
 * GET assessments (Admin all / Teacher own)
 * ============================================================
 */
router.get(
  "/",
  authenticate,
  requireRole([Role.TEACHER, Role.ADMIN]),
  async (req, res) => {
    const user = req.user!;

    const where =
      user.role === Role.TEACHER
        ? { subject: { teacherId: user.id } }
        : {};

    const data = await prisma.assessment.findMany({
      where,
      include: {
        subject: true,
        class: true,
        term: true,
      },
      orderBy: { date: "desc" },
    });

    res.json(data);
  }
);

/**
 * ============================================================
 * GET SINGLE ASSESSMENT
 * GET /assessments/:id
 * ============================================================
 */
router.get(
  "/:id",
  authenticate,
  requireRole([Role.TEACHER, Role.ADMIN]),
  async (req, res) => {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid assessment id" });
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        subject: true,
        class: true,
        term: true,
      },
    });

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    if (
      req.user!.role === Role.TEACHER &&
      assessment.subject.teacherId !== req.user!.id
    ) {
      return res.status(403).json({
        message: "You are not allowed to access this assessment",
      });
    }

    res.json(assessment);
  }
);

/**
 * ============================================================
 * A. GET SCORES
 * ============================================================
 */
router.get(
  "/:id/scores",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    const assessmentId = Number(req.params.id);

    if (Number.isNaN(assessmentId)) {
      return res.status(400).json({ message: "Invalid assessment id" });
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { subject: true },
    });

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    if (assessment.subject.teacherId !== req.user!.id) {
      return res.status(403).json({
        message: "You are not allowed to access this assessment.",
      });
    }

    const link = await prisma.classSubject.findFirst({
      where: {
        classId: assessment.classId,
        subjectId: assessment.subjectId,
      },
    });

    if (!link) {
      return res.status(403).json({
        message: "You are not allowed to access this assessment.",
      });
    }

    const students = await prisma.student.findMany({
      where: {
        enrollments: {
          some: { subjectId: assessment.subjectId },
        },
      },
    });

    const scores = await prisma.assessmentScore.findMany({
      where: { assessmentId },
    });

    res.json({ assessment, students, scores });
  }
);

/**
 * ============================================================
 * B. SAVE SCORES (DRAFT only)
 * ============================================================
 */
router.post(
  "/:id/scores",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid assessment id" });
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { subject: true },
    });

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    if (assessment.subject.teacherId !== req.user!.id) {
      return res.status(403).json({
        message: "You are not allowed to access this assessment.",
      });
    }

    if (assessment.status !== "DRAFT") {
      return res.status(400).json({ message: "Locked" });
    }

    const { scores } = req.body;

    if (!Array.isArray(scores)) {
      return res.status(400).json({
        message: "Invalid payload. Expected scores to be an array.",
      });
    }

    for (const s of scores) {
      await prisma.assessmentScore.upsert({
        where: {
          assessmentId_studentId: {
            assessmentId: id,
            studentId: s.studentId,
          },
        },
        update: { score: s.score },
        create: {
          assessmentId: id,
          studentId: s.studentId,
          score: s.score,
        },
      });
    }

    res.json({ message: "Saved" });
  }
);

/**
 * ============================================================
 * C. SUBMIT
 * ============================================================
 */
router.patch(
  "/:id/submit",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid or missing assessment id in URL",
      });
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { subject: true },
    });

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    if (assessment.subject.teacherId !== req.user!.id) {
      return res.status(403).json({
        message: "You are not allowed to access this assessment.",
      });
    }

    if (assessment.status !== "DRAFT") {
      return res.status(400).json({
        message: "Only DRAFT assessments can be submitted",
      });
    }

    await prisma.assessment.update({
      where: { id },
      data: { status: "SUBMITTED" },
    });

    await computeGradesForSubject({
      classId: assessment.classId,
      subjectId: assessment.subjectId,
      termId: assessment.termId,
    });

    res.json({ message: "Locked" });
  }
);

/**
 * ============================================================
 * DELETE assessment
 * ============================================================
 */
router.delete(
  "/:id",
  authenticate,
  requireRole([Role.TEACHER, Role.ADMIN]),
  async (req, res) => {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid assessment id" });
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { subject: true },
    });

    if (!assessment) {
      return res.status(404).json({ message: "Not found" });
    }

    if (
      req.user!.role === Role.TEACHER &&
      assessment.subject.teacherId !== req.user!.id
    ) {
      return res.status(403).json({
        message: "You cannot delete another teacher's assessment",
      });
    }

    await prisma.assessment.delete({ where: { id } });

    res.json({ message: "Deleted" });
  }
);

export { router as assessmentRoutes };
