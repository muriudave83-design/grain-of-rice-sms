import { Request, Response } from "express";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Health check
 */
export const healthCheck = async (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
};

/**
 * Teacher dashboard
 * - expects authenticateToken middleware to set req.user
 */
export const teacherDashboard = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Subjects owned by teacher
    const subjects = await prisma.subject.findMany({
      where: { teacherId: user.id },
      select: { id: true },
    });

    const subjectIds = subjects.map((s) => s.id);
    const subjectsCount = subjectIds.length;

    // Students across teacher's subjects
    const studentsCount = subjectIds.length
      ? await prisma.enrollment.count({
          where: { subjectId: { in: subjectIds } },
        })
      : 0;

    // Assessments for these subjects
    const assessments = subjectIds.length
      ? await prisma.assessment.findMany({
          where: { subjectId: { in: subjectIds } },
          select: { id: true },
        })
      : [];

    let missingCount = 0;

    if (assessments.length > 0 && subjectIds.length > 0) {
      const assessmentIds = assessments.map((a) => a.id);

      const enrollmentsCount = await prisma.enrollment.count({
        where: { subjectId: { in: subjectIds } },
      });

      const existingScoresCount = await prisma.assessmentScore.count({
        where: { assessmentId: { in: assessmentIds } },
      });

      // Expected scores = enrollments × assessments
      const expectedScores = enrollmentsCount * assessmentIds.length;
      missingCount = Math.max(0, expectedScores - existingScoresCount);
    }

    // ✅ Average grade across teacher's subjects (Phase 2 compliant)
    const avg = await prisma.grade.aggregate({
      where: {
        subjectId: { in: subjectIds },
      },
      _avg: {
        average: true,
      },
    });

    res.json({
      subjects: subjectsCount,
      students: studentsCount,
      missing: missingCount,
      avgClassScore: avg._avg?.average ?? 0,
    });
  } catch (err) {
    console.error("teacherDashboard error:", err);
    res.status(500).json({
      message: "Server error",
      error: (err as Error).message,
    });
  }
};

/**
 * Admin dashboard
 */
export const adminDashboard = async (_req: Request, res: Response) => {
  try {
    const [students, teachers, subjects] = await Promise.all([
      prisma.student.count(),
      prisma.user.count({ where: { role: Role.TEACHER } }),
      prisma.subject.count(),
    ]);

    res.json({ students, teachers, subjects });
  } catch (err) {
    console.error("adminDashboard error:", err);
    res.status(500).json({
      message: "Server error",
      error: (err as Error).message,
    });
  }
};

/**
 * List all students (admin only)
 */
export const listAllStudents = async (_req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      take: 200,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        class: {
          select: {
            name: true,
          },
        },
      },
    });

    res.json(students);
  } catch (err) {
    console.error("listAllStudents error:", err);
    res.status(500).json({
      message: "Server error",
      error: (err as Error).message,
    });
  }
};

/**
 * List all subjects (admin / public)
 */
export const listAllSubjects = async (_req: Request, res: Response) => {
  try {
    const subjects = await prisma.subject.findMany({
      take: 200,
      select: {
        id: true,
        name: true,
        code: true,
        teacherId: true,
      },
    });

    res.json(subjects);
  } catch (err) {
    console.error("listAllSubjects error:", err);
    res.status(500).json({
      message: "Server error",
      error: (err as Error).message,
    });
  }
};
