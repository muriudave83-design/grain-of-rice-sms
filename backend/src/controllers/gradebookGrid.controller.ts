import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { AssessmentStatus } from "@prisma/client";

export const getGradebookGrid = async (req: Request, res: Response) => {
  try {
    const classId = Number(req.query.classId);
    const subjectId = Number(req.query.subjectId);
    const termId = Number(req.query.termId);

    if (!classId || !subjectId || !termId) {
      return res.status(400).json({
        message: "classId, subjectId and termId are required",
      });
    }

    // 1️⃣ Assessments for class + subject + term
    const assessments = await prisma.assessment.findMany({
      where: { classId, subjectId, termId },
      orderBy: { id: "asc" },
      select: {
        id: true,
        title: true,
        maxScore: true,
        status: true,
        categoryId: true,
      },
    });

    // 2️⃣ Fetch categories with weights
    const categories = await prisma.assignmentCategory.findMany({
      select: {
        id: true,
        weight: true,
      },
    });

    // 3️⃣ Build category weight lookup map
    const categoryWeightMap: Record<number, number> = {};
    for (const c of categories) {
      categoryWeightMap[c.id] = c.weight;
    }

    // 4️⃣ Students in class
    const students = await prisma.student.findMany({
      where: { classId },
      orderBy: { firstName: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    // 5️⃣ Scores
    const assessmentIds = assessments.map((a) => a.id);

    const scores =
      assessmentIds.length > 0
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

    // 6️⃣ Build score map
    const scoreMap: Record<number, Record<string, number>> = {};

    for (const s of scores) {
      if (!scoreMap[s.studentId]) {
        scoreMap[s.studentId] = {};
      }
      scoreMap[s.studentId][String(s.assessmentId)] = s.score;
    }

    // Filter only published assessments for missing count
    const activeAssessments = assessments.filter(
      (a) => a.status === AssessmentStatus.SUBMITTED
    );

    // 7️⃣ Build rows
    const studentRows = students.map((student) => {
      const studentScores = scoreMap[student.id] || {};
      const categoryBuckets: Record<number, number[]> = {};

      // group normalized scores per category
      for (const assessment of assessments) {
        const score = studentScores[String(assessment.id)];

        if (
          score != null &&
          assessment.categoryId &&
          assessment.maxScore > 0
        ) {
          // ✅ Normalize score (important fix)
          const value = score / assessment.maxScore;

          if (!categoryBuckets[assessment.categoryId]) {
            categoryBuckets[assessment.categoryId] = [];
          }

          categoryBuckets[assessment.categoryId].push(value);
        }
      }

      // compute weighted average
      let weightedTotal = 0;
      let totalWeightUsed = 0;

      for (const categoryId of Object.keys(categoryBuckets)) {
        const parsedCategoryId = parseInt(categoryId, 10);
        const values = categoryBuckets[parsedCategoryId];
        const weight = (categoryWeightMap[parsedCategoryId] ?? 0) / 100;

        // skip invalid categories
        if (!weight) continue;

        const categoryAverage =
          values.reduce((a, b) => a + b, 0) / values.length;

        weightedTotal += categoryAverage * weight;
        totalWeightUsed += weight;
      }

      const average =
        totalWeightUsed > 0
          ? Number((weightedTotal / totalWeightUsed).toFixed(2))
          : null;

      // better missing count (only published)
      const missingCount =
        activeAssessments.length -
        activeAssessments.filter(
          (a) => studentScores[String(a.id)] != null
        ).length;

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