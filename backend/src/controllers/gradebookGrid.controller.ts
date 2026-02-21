import { Request, Response } from "express";
import { prisma } from "../prisma/client";

export const getGradebookGrid = async (req: Request, res: Response) => {
  try {
    const classId = Number(req.query.classId);
    const subjectId = Number(req.query.subjectId);

    if (!classId || !subjectId) {
      return res.status(400).json({
        message: "classId and subjectId required",
      });
    }

    // 1️⃣ Assessments for class + subject
    const assessments = await prisma.assessment.findMany({
      where: { classId, subjectId },
      orderBy: { id: "asc" },
      select: {
        id: true,
        title: true,
        maxScore: true,
        status: true,
      },
    });

    // 2️⃣ Students in class
    const students = await prisma.student.findMany({
      where: { classId },
      orderBy: { firstName: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    // 3️⃣ Scores
    const assessmentIds = assessments.map(a => a.id);

    const scores = assessmentIds.length > 0
      ? await prisma.assessmentScore.findMany({
          where: {
            assessmentId: { in: assessmentIds },
          },
          select: {
            assessmentId: true,
            studentId: true,
            score: true,
          },
        })
      : [];

    // 4️⃣ Build score map
    const scoreMap: Record<number, Record<number, number>> = {};

    for (const s of scores) {
      if (!scoreMap[s.studentId]) {
        scoreMap[s.studentId] = {};
      }
      scoreMap[s.studentId][s.assessmentId] = s.score;
    }

    // 5️⃣ Build rows
    const studentRows = students.map(student => {
      const studentScores = scoreMap[student.id] || {};

      const values = Object.values(studentScores);
      const average =
        values.length > 0
          ? Number(
              (
                values.reduce((a, b) => a + b, 0) /
                values.length
              ).toFixed(2)
            )
          : null;

      const missingCount =
        assessments.length - values.length;

      return {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        scores: studentScores,
        average,
        missingCount,
      };
    });

    res.json({
      assessments,
      students: studentRows,
    });

  } catch (err) {
    console.error("Failed to build gradebook grid:", err);
    res.status(500).json({
      message: "Failed to load gradebook",
    });
  }
};
