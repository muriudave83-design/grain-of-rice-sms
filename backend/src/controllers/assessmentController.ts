import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { AssessmentStatus, AssessmentType } from "@prisma/client";
import { getMissingAssignmentsForStudent } from "../utils/missingAssignments";
import { generateReportCards } from "../utils/reportCardGenerator";

/**
 * =====================================================
 * CREATE ASSESSMENT (DRAFT ONLY)
 * =====================================================
 */
export const createAssessment = async (req: Request, res: Response) => {
  try {

    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized teacher" });
    }

    const teacherId = Number(req.user.id);

    const subjectId = Number(req.body.subjectId);
    const classId = Number(req.body.classId);
    const termId = Number(req.body.termId);
    const categoryId = Number(req.body.categoryId);
    const maxScore = Number(req.body.maxScore);

    const title = req.body.title;
    const weight = Number(req.body.weight ?? 0);
    const date = req.body.date ? new Date(req.body.date) : new Date();

    const typeRaw = req.body.type;

    /**
     * ENUM VALIDATION
     */
    if (!Object.values(AssessmentType).includes(typeRaw as AssessmentType)) {
      return res.status(400).json({
        error: "Invalid assessment type"
      });
    }

    const type: AssessmentType = typeRaw as AssessmentType;

    /**
     * REQUIRED FIELD VALIDATION
     */
    if (
      !subjectId ||
      !classId ||
      !termId ||
      !title ||
      !maxScore ||
      !categoryId
    ) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }

    if (weight < 0) {
      return res.status(400).json({
        error: "Weight cannot be negative"
      });
    }

    const assessment = await prisma.$transaction(async (tx) => {

      /**
       * SECURITY
       * Teacher must be assigned to this class + subject
       */
      const assignment = await tx.teacherSubject.findFirst({
        where: {
          teacherId,
          subjectId,
          classId
        }
      });

      if (!assignment) {
        throw new Error(
          "You are not assigned to teach this subject for this class"
        );
      }

      /**
       * WEIGHT VALIDATION
       */
      const existing = await tx.assessment.aggregate({
        where: {
          subjectId,
          termId,
          classId
        },
        _sum: { weight: true }
      });

      const currentWeight = existing._sum.weight ?? 0;

      if (currentWeight + weight > 1) {
        throw new Error("Weight limit exceeded");
      }

      /**
       * CREATE ASSESSMENT
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
          categoryId,
          status: AssessmentStatus.DRAFT
        }
      });

    });

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
      error: "Failed to create assessment"
    });
  }
};


/**
 * =====================================================
 * SET STUDENT SCORE
 * =====================================================
 */
export const setStudentScore = async (req: Request, res: Response) => {

  try {

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized teacher" });
    }

    const teacherId = Number(req.user.id);

    const assessmentId = Number(req.body.assessmentId);
    const studentId = Number(req.body.studentId);
    const score = Number(req.body.score);

    const result = await prisma.$transaction(async (tx) => {

      const assessment = await tx.assessment.findUnique({
        where: { id: assessmentId }
      });

      if (!assessment) {
        throw new Error("Assessment not found");
      }

      /**
       * SECURITY CHECK
       */
      const assignment = await tx.teacherSubject.findFirst({
        where: {
          teacherId,
          subjectId: assessment.subjectId,
          classId: assessment.classId
        }
      });

      if (!assignment) {
        throw new Error("Not authorized to modify this assessment");
      }

      /**
       * SCORE VALIDATION
       */
      if (score < 0) {
        throw new Error("Score cannot be negative");
      }

      if (score > assessment.maxScore) {
        throw new Error("Score exceeds maximum allowed");
      }

      /**
       * UPSERT SCORE
       */
      const record = await tx.assessmentScore.upsert({
        where: {
          assessmentId_studentId: {
            assessmentId,
            studentId
          }
        },
        update: { score },
        create: {
          assessmentId,
          studentId,
          score
        }
      });

      /**
       * RECALCULATE FINAL GRADE
       */
      await recalculateFinalGrade(studentId, assessmentId, tx);

      return record;

    });

    res.json(result);

  } catch (err: any) {

    console.error(err);

    if (err.message === "Assessment not found") {
      return res.status(404).json({ error: err.message });
    }

    if (err.message === "Not authorized to modify this assessment") {
      return res.status(403).json({ error: err.message });
    }

    if (
      err.message === "Score cannot be negative" ||
      err.message === "Score exceeds maximum allowed"
    ) {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: "Failed to set score" });
  }
};


/**
 * =====================================================
 * SUBMIT ASSESSMENT
 * =====================================================
 */
export const submitAssessment = async (req: Request, res: Response) => {

  try {

    const assessmentId = Number(req.params.id);
    const teacherId = Number(req.user!.id);

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId }
    });

    if (!assessment) {
      return res.status(404).json({
        message: "Assessment not found"
      });
    }

    const assignment = await prisma.teacherSubject.findFirst({
      where: {
        teacherId,
        subjectId: assessment.subjectId,
        classId: assessment.classId
      }
    });

    if (!assignment) {
      return res.status(403).json({
        message:
          "You are not assigned to submit assessments for this class and subject."
      });
    }

    if (assessment.status !== AssessmentStatus.DRAFT) {
      return res.status(400).json({
        message: "Assessment already submitted"
      });
    }

    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: AssessmentStatus.SUBMITTED
      }
    });

    await generateReportCards(
      assessment.termId,
      assessment.classId
    );

    return res.json({
      message: "Assessment submitted successfully"
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed to submit assessment"
    });
  }
};


/**
 * =====================================================
 * RECALCULATE FINAL GRADE
 * =====================================================
 */
const recalculateFinalGrade = async (
  studentId: number,
  assessmentId: number,
  tx: any = prisma
) => {

  const assessment = await tx.assessment.findUnique({
    where: { id: assessmentId }
  });

  if (!assessment) return;

  const subjectId = assessment.subjectId;
  const termId = assessment.termId;

  const scores = await tx.assessmentScore.findMany({
    where: {
      studentId,
      assessment: {
        subjectId,
        termId
      }
    },
    include: { assessment: true }
  });

  let finalScore = 0;

  for (const record of scores) {

    if (!record.assessment.maxScore) continue;

    const percent = record.score / record.assessment.maxScore;

    finalScore += percent * record.assessment.weight;
  }

  await tx.grade.upsert({
    where: {
      studentId_subjectId_termId: {
        studentId,
        subjectId,
        termId
      }
    },
    update: {
      total: finalScore,
      average: finalScore
    },
    create: {
      studentId,
      subjectId,
      termId,
      total: finalScore,
      average: finalScore
    }
  });
};


/**
 * =====================================================
 * TEACHER GRADEBOOK
 * =====================================================
 */
export const getGradebook = async (req: Request, res: Response) => {

  const subjectId = Number(req.params.subjectId);

  const assessments = await prisma.assessment.findMany({
    where: { subjectId },
    include: {
      scores: {
        include: { student: true }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  res.json(assessments);
};


/**
 * =====================================================
 * PARENT GRADEBOOK
 * =====================================================
 */
export const getParentGradebook = async (req: Request, res: Response) => {

  const studentId = Number(req.params.studentId);

  const assessments = await prisma.assessment.findMany({
    where: {
      scores: { some: { studentId } },
      status: AssessmentStatus.SUBMITTED
    },
    include: {
      scores: {
        where: { studentId }
      }
    }
  });

  res.json(assessments);
};


/**
 * =====================================================
 * MISSING ASSIGNMENTS
 * =====================================================
 */
export const getMissingAssignments = async (
  req: Request,
  res: Response
) => {

  const studentId = Number(req.params.studentId);

  const missing = await getMissingAssignmentsForStudent(studentId);

  res.json(missing);
};
