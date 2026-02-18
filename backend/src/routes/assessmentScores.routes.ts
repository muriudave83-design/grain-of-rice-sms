import { Router } from "express";
import { prisma as basePrisma } from "../prisma/client";
const prisma: any = basePrisma;

import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";

const router = Router();

/**
 * ============================================================
 * GET students + existing scores for an assessment
 * ============================================================
 */
router.get(
  "/:id/scores",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    // ✅ REQUIRED DEBUG LOGS
    console.log("🔥 SCORES ROUTE HIT");
    console.log("PARAM ID =", req.params.id);
    console.log("USER =", req.user);
    console.log("🔥 /assessments/:id/scores ROUTE HIT");

    const id = Number(req.params.id);
    const user = req.user!;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        subject: true,
        scores: true,
      },
    });

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    if (!assessment.classId) {
      return res.status(400).json({
        message: "Assessment is not linked to a class",
      });
    }

    // ------------------------------------------------------------
    // OWNERSHIP CHECK
    // ------------------------------------------------------------
    if (assessment.subject.teacherId !== user.id) {
      return res.status(403).json({
        message: "You are not allowed to access this assessment.",
      });
    }

    // ------------------------------------------------------------
    // CLASS ↔ SUBJECT LINK CHECK
    // ------------------------------------------------------------
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

    // ============================================================
    // LOAD STUDENTS VIA ENROLLMENT (TIGHT SELECT) ✅
    // ============================================================

    const enrollments = await prisma.enrollment.findMany({
      where: {
        subjectId: assessment.subjectId,
      },
      include: {
        student: {
          select: {
            id: true,
            admissionNo: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        student: { firstName: "asc" },
      },
    });

    const students = enrollments.map((e: any) => e.student);

    console.log("STUDENTS FOUND =", students.length);

    // ============================================================

    res.json({
      assessment: {
        id: assessment.id,
        title: assessment.title,
        maxScore: assessment.maxScore,
        status: assessment.status,
      },
      students,
      scores: assessment.scores,
    });
  }
);

/**
 * ============================================================
 * SAVE / UPDATE SCORES (DRAFT)
 * ============================================================
 */
router.post(
  "/:id/scores",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    const id = Number(req.params.id);
    const user = req.user!;
    const { scores } = req.body;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { subject: true },
    });

    if (!assessment) {
      return res.status(404).json({ message: "Not found" });
    }

    if (assessment.subject.teacherId !== user.id) {
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

    if (assessment.status === "SUBMITTED") {
      return res.status(400).json({
        message: "Assessment already submitted — locked",
      });
    }

    for (const s of scores) {
      await prisma.assessmentScore.upsert({
        where: {
          assessmentId_studentId: {
            assessmentId: id,
            studentId: Number(s.studentId),
          },
        },
        update: { score: Number(s.score) },
        create: {
          assessmentId: id,
          studentId: Number(s.studentId),
          score: Number(s.score),
        },
      });
    }

    res.json({ message: "Scores saved" });
  }
);

/**
 * ============================================================
 * SUBMIT (LOCK)
 * ============================================================
 */
router.post(
  "/:id/submit",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    const id = Number(req.params.id);
    const user = req.user!;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { subject: true },
    });

    if (!assessment) {
      return res.status(404).json({ message: "Not found" });
    }

    if (assessment.subject.teacherId !== user.id) {
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

    await prisma.assessment.update({
      where: { id },
      data: { status: "SUBMITTED" },
    });

    res.json({ message: "Assessment submitted and locked" });
  }
);

export default router;
