import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { AssessmentStatus } from "@prisma/client";
import { getMissingAssignmentsForStudent } from "../utils/missingAssignments";
import { generateReportCards } from "../utils/reportCardGenerator";

/**
 * Create an assessment (DRAFT only)
 */
export const createAssessment = async (req: Request, res: Response) => {
  try {
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    /**
     * 🔐 Bulletproof authentication
     */
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized teacher" });
    }

    /**
     * 🔢 Normalize IDs safely
     */
    const teacherId = Number(req.user.id);
    const subjectId = Number(req.body.subjectId);
    const classId = Number(req.body.classId);
    const termId = Number(req.body.termId);
    const categoryId = Number(req.body.categoryId);
    const maxScore = Number(req.body.maxScore);

    const title = req.body.title;
    const type = req.body.type;
    const weight = Number(req.body.weight ?? 0);
    const date = req.body.date ? new Date(req.body.date) : new Date();

    /**
     * Required validation
     */
    if (
      !subjectId ||
      !classId ||
      !termId ||
      !title ||
      !type ||
      !maxScore ||
      !categoryId
    ) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    if (weight < 0) {
      return res.status(400).json({
        error: "Weight cannot be negative",
      });
    }

    console.log("ASSESSMENT REQUEST:", {
      teacherId,
      subjectId,
      classId,
    });

    /**
     * 🚀 ENTERPRISE-SAFE ATOMIC CREATION
     */
    const assessment = await prisma.$transaction(async (tx) => {

      /**
       * 🔐 Teacher assignment validation
       */
      const assignment = await tx.teacherSubject.findFirst({
        where: {
          teacherId,
          subjectId,
          classId,
        },
      });

      if (!assignment) {
        throw new Error(
          "You are not assigned to teach this subject for this class"
        );
      }

      /**
       * ⚖️ Weight validation
       */
      const existing = await tx.assessment.aggregate({
        where: {
          subjectId,
          termId,
          classId,
        },
        _sum: { weight: true },
      });

      const currentWeight = existing._sum.weight ?? 0;

      if (currentWeight + weight > 1) {
        throw new Error("Weight limit exceeded");
      }

      /**
       * ✅ Create assessment
       */
      return tx.assessment.create({
        data: {
          subjectId,
          classId,
          termId,
          title,
          type,
          date,
          maxScore,
          weight,
          status: AssessmentStatus.DRAFT,
          categoryId,
        },
      });
    });

    console.log("ASSESSMENT CREATED:", assessment.id);

    return res.json(assessment);
  } catch (err: any) {
    console.error("CREATE ASSESSMENT ERROR:", err);

    if (err.message === "Weight limit exceeded") {
      return res.status(400).json({ error: err.message });
    }

    if (err.message.includes("assigned")) {
      return res.status(403).json({ error: err.message });
    }

    return res.status(500).json({
      error: "Failed to create assessment",
    });
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
 * Submit assessment (LOCKS IT)
 */
export const submitAssessment = async (req: Request, res: Response) => {
  try {
    const assessmentId = Number(req.params.id);
    const teacherId = Number(req.user!.id);

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    const assignment = await prisma.teacherSubject.findFirst({
      where: {
        teacherId,
        subjectId: assessment.subjectId,
        classId: assessment.classId,
      },
    });

    if (!assignment) {
      console.error("TEACHER SUBMIT BLOCKED", {
        teacherId,
        subjectId: assessment.subjectId,
        classId: assessment.classId,
      });

      return res.status(403).json({
        message:
          "You are not assigned to submit assessments for this class and subject.",
      });
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

    await generateReportCards(
      assessment.termId,
      assessment.classId
    );

    return res.json({ message: "Assessment submitted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit assessment" });
  }
};

/**
 * Recalculate final grade
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
      assessment: {
        subjectId,
        termId,
      },
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
