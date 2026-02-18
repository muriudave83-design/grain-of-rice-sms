import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { AssessmentStatus } from "@prisma/client";
import { getMissingAssignmentsForStudent } from "../utils/missingAssignments";

/**
 * Create an assessment (DRAFT only)
 */

export const createAssessment = async (req: Request, res: Response) => {
  try {
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      subjectId,
      classId,
      termId,
      title,
      type,
      date,
      maxScore,
      weight,
      categoryId,
    } = req.body;

    // ✅ Required field validation
    if (
      !subjectId ||
      !classId ||
      !termId ||
      !title ||
      !type || // 🔥 REQUIRED
      !date ||
      !maxScore ||
      !categoryId
    ) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    // Default weight to 0 if not provided
    const safeWeight = weight ?? 0;

    if (safeWeight < 0) {
      return res.status(400).json({
        error: "Weight cannot be negative",
      });
    }

    // ✅ Check total weight limit
    const existing = await prisma.assessment.aggregate({
      where: { subjectId, termId, classId },
      _sum: { weight: true },
    });

    const currentWeight = existing._sum.weight ?? 0;

    if (currentWeight + safeWeight > 1) {
      return res.status(400).json({
        error: `Weight limit exceeded. Current: ${currentWeight}, Adding: ${safeWeight}`,
      });
    }

    const assessment = await prisma.assessment.create({
      data: {
        subjectId: Number(subjectId),
        classId: Number(classId),
        termId: Number(termId),
        title,
        type, // ✅ Now guaranteed to exist
        date: new Date(date),
        maxScore: Number(maxScore),
        weight: safeWeight,
        status: AssessmentStatus.DRAFT,
        categoryId: Number(categoryId),
      },
    });

    res.json(assessment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create assessment" });
  }
};

/**
 * Record a student's score (ONLY if assessment is DRAFT)
 */
export const setStudentScore = async (req: Request, res: Response) => {
  try {
    const { assessmentId, studentId, score } = req.body;

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    if (assessment.status !== AssessmentStatus.DRAFT) {
      return res.status(409).json({
        error: "Assessment is submitted and cannot be modified",
      });
    }

    const record = await prisma.assessmentScore.upsert({
      where: {
        assessmentId_studentId: { assessmentId, studentId },
      },
      update: { score },
      create: { assessmentId, studentId, score },
    });

    await recalculateFinalGrade(studentId, assessmentId);

    res.json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to set score" });
  }
};

/**
 * Submit assessment (LOCKS IT) — Teacher only, ownership enforced
 */
export const submitAssessment = async (req: Request, res: Response) => {
  try {
    const assessmentId = Number(req.params.id);
    const teacherId = req.user!.id;

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        subject: true,
      },
    });

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    console.log("❌ Authorization failed");
    if (assessment.subject.teacherId !== teacherId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (assessment.status !== AssessmentStatus.DRAFT) {
      return res
        .status(400)
        .json({ message: "Assessment already submitted" });
    }

    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: AssessmentStatus.SUBMITTED,
      },
    });

    return res.json({ message: "Assessment submitted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit assessment" });
  }
};

/**
 * Recalculate final grade (SAFE — only reads)
 */
const recalculateFinalGrade = async (
  studentId: number,
  assessmentId: number
) => {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
  });

  if (!assessment) return;

  const subjectId = assessment.subjectId;
  const termId = assessment.termId;

  const scores = await prisma.assessmentScore.findMany({
    where: {
      studentId,
      assessment: { subjectId },
    },
    include: { assessment: true },
  });

  let finalScore = 0;

  for (const record of scores) {
    if (!record.assessment.maxScore) continue;

    const percent = record.score / record.assessment.maxScore;
    finalScore += percent * record.assessment.weight;
  }

  await prisma.grade.upsert({
    where: {
      studentId_subjectId_termId: {
        studentId,
        subjectId,
        termId,
      },
    },
    update: {
      total: finalScore,
      average: finalScore,
    },
    create: {
      studentId,
      subjectId,
      termId,
      total: finalScore,
      average: finalScore,
    },
  });
};

/**
 * Teacher gradebook
 */
export const getGradebook = async (req: Request, res: Response) => {
  const { subjectId } = req.params;

  const assessments = await prisma.assessment.findMany({
    where: { subjectId: Number(subjectId) },
    include: {
      scores: { include: { student: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  res.json(assessments);
};

/**
 * Parent gradebook
 */
export const getParentGradebook = async (req: Request, res: Response) => {
  const { studentId } = req.params;

  const assessments = await prisma.assessment.findMany({
    where: {
      scores: { some: { studentId: Number(studentId) } },
      status: AssessmentStatus.SUBMITTED,
    },
    include: {
      scores: { where: { studentId: Number(studentId) } },
    },
  });

  res.json(assessments);
};

/**
 * Missing assignments
 */
export const getMissingAssignments = async (req: Request, res: Response) => {
  const { studentId } = req.params;
  const missing = await getMissingAssignmentsForStudent(Number(studentId));
  res.json(missing);
};
