import { Router } from "express";
import { prisma as basePrisma } from "../prisma/client";

// TEMP TYPE BRIDGE — runtime is correct
const prisma: any = basePrisma;

import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { requireTeacherAssignment } from "../middlewares/teacherAssignmentGuard";
import { Role } from "@prisma/client";
import { computeGradesForSubject } from "../services/grade.service";
import { createAssessment } from "../controllers/assessmentController";

const router = Router();

console.log("✅ assessmentRoutes LOADED");

/**
 * ============================================================
 * CREATE ASSESSMENT
 * ============================================================
 */
router.post(
  "/",
  authenticate,
  requireRole([Role.TEACHER]),
  requireTeacherAssignment,
  createAssessment
);

/**
 * ============================================================
 * TEACHER OWN ASSESSMENTS
 * ============================================================
 */
router.get(
  "/mine",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    const teacherId = req.user!.id;

    const assignments = await prisma.teacherSubject.findMany({
      where: { teacherId },
      select: { subjectId: true, classId: true }
    });

    const data = await prisma.assessment.findMany({
      where: {
        OR: assignments.map((a: any) => ({
          subjectId: a.subjectId,
          classId: a.classId
        }))
      },
      include: {
        subject: true,
        class: true,
        term: true
      },
      orderBy: { date: "desc" }
    });

    res.json(data);
  }
);

/**
 * ============================================================
 * ⭐ TEACHER SUBJECTS FILTERED BY CLASS
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

    const assignments = await prisma.teacherSubject.findMany({
      where: { teacherId, classId },
      include: { subject: true },
      orderBy: { subject: { name: "asc" } }
    });

    const subjects = assignments.map((a: any) => a.subject);

    res.json(subjects);
  }
);

/**
 * ============================================================
 * GET ASSESSMENTS
 * ============================================================
 */
router.get(
  "/",
  authenticate,
  requireRole([Role.TEACHER, Role.ADMIN]),
  async (req, res) => {
    const user = req.user!;
    let where: any = {};

    if (user.role === Role.TEACHER) {
      const assignments = await prisma.teacherSubject.findMany({
        where: { teacherId: user.id },
        select: { subjectId: true, classId: true }
      });

      where = {
        OR: assignments.map((a: any) => ({
          subjectId: a.subjectId,
          classId: a.classId
        }))
      };
    }

    const data = await prisma.assessment.findMany({
      where,
      include: {
        subject: true,
        class: true,
        term: true
      },
      orderBy: { date: "desc" }
    });

    res.json(data);
  }
);

/**
 * ============================================================
 * GET SINGLE ASSESSMENT
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
      include: { subject: true, class: true, term: true }
    });

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    if (req.user!.role === Role.TEACHER) {
      const assignment = await prisma.teacherSubject.findFirst({
        where: {
          teacherId: req.user!.id,
          subjectId: assessment.subjectId,
          classId: assessment.classId
        }
      });

      if (!assignment) {
        return res.status(403).json({
          message: "You are not allowed to access this assessment"
        });
      }
    }

    res.json(assessment);
  }
);

/**
 * ============================================================
 * GET SCORES
 * ============================================================
 */
router.get(
  "/:id/scores",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    const assessmentId = Number(req.params.id);

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId }
    });

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    const assignment = await prisma.teacherSubject.findFirst({
      where: {
        teacherId: req.user!.id,
        subjectId: assessment.subjectId,
        classId: assessment.classId
      }
    });

    if (!assignment) {
      return res.status(403).json({
        message: "You are not allowed to access this assessment"
      });
    }

    const students = await prisma.student.findMany({
      where: { classId: assessment.classId }
    });

    const scores = await prisma.assessmentScore.findMany({
      where: { assessmentId }
    });

    res.json({ assessment, students, scores });
  }
);

/**
 * ============================================================
 * SAVE SCORES
 * ============================================================
 */
router.post(
  "/:id/scores",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    const id = Number(req.params.id);

    const assessment = await prisma.assessment.findUnique({
      where: { id }
    });

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    const assignment = await prisma.teacherSubject.findFirst({
      where: {
        teacherId: req.user!.id,
        subjectId: assessment.subjectId,
        classId: assessment.classId
      }
    });

    if (!assignment) {
      return res.status(403).json({
        message: "You are not allowed to access this assessment"
      });
    }

    if (assessment.status !== "DRAFT") {
      return res.status(400).json({ message: "Locked" });
    }

    const { scores } = req.body;

    for (const s of scores) {
      await prisma.assessmentScore.upsert({
        where: {
          assessmentId_studentId: {
            assessmentId: id,
            studentId: s.studentId
          }
        },
        update: { score: s.score },
        create: {
          assessmentId: id,
          studentId: s.studentId,
          score: s.score
        }
      });
    }

    res.json({ message: "Saved" });
  }
);

/**
 * ============================================================
 * SUBMIT
 * ============================================================
 */
router.patch(
  "/:id/submit",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    const id = Number(req.params.id);

    const assessment = await prisma.assessment.findUnique({
      where: { id }
    });

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    const assignment = await prisma.teacherSubject.findFirst({
      where: {
        teacherId: req.user!.id,
        subjectId: assessment.subjectId,
        classId: assessment.classId
      }
    });

    if (!assignment) {
      return res.status(403).json({
        message: "You are not allowed to access this assessment"
      });
    }

    await prisma.assessment.update({
      where: { id },
      data: { status: "SUBMITTED" }
    });

    await computeGradesForSubject({
      classId: assessment.classId,
      subjectId: assessment.subjectId,
      termId: assessment.termId
    });

    res.json({ message: "Locked" });
  }
);

/**
 * ============================================================
 * SUBMIT (FRONTEND COMPATIBILITY ROUTE)
 * ============================================================
 */
router.post(
  "/:id/submit",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req: any, res) => {
    try {
      const assessmentId = Number(req.params.id);
      const teacherId = req.user.id;

      const assessment = await prisma.assessment.findFirst({
        where: {
          id: assessmentId,
          teacherId: teacherId
        }
      });

      if (!assessment) {
        return res.status(403).json({
          message: "You cannot submit this assessment"
        });
      }

      const scores = await prisma.score.count({
        where: { assessmentId }
      });

      if (scores === 0) {
        return res.status(400).json({
          message: "No scores entered"
        });
      }

      const updated = await prisma.assessment.update({
        where: { id: assessmentId },
        data: { status: "SUBMITTED" }
      });

      res.json(updated);

    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Failed to submit assessment"
      });
    }
  }
);

/**
 * ============================================================
 * DELETE
 * ============================================================
 */
router.delete(
  "/:id",
  authenticate,
  requireRole([Role.TEACHER, Role.ADMIN]),
  async (req, res) => {
    const id = Number(req.params.id);

    const assessment = await prisma.assessment.findUnique({
      where: { id }
    });

    if (!assessment) {
      return res.status(404).json({ message: "Not found" });
    }

    if (req.user!.role === Role.TEACHER) {
      const assignment = await prisma.teacherSubject.findFirst({
        where: {
          teacherId: req.user!.id,
          subjectId: assessment.subjectId,
          classId: assessment.classId
        }
      });

      if (!assignment) {
        return res.status(403).json({
          message: "You cannot delete another teacher's assessment"
        });
      }
    }

    await prisma.assessment.delete({ where: { id } });

    res.json({ message: "Deleted" });
  }
);

export { router as assessmentRoutes };