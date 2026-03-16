import { prisma } from "../prisma/client";

type ComputeGradesInput = {
  classId: number;
  subjectId: number;
  termId: number;
};

export async function computeGradesForSubject({
  classId,
  subjectId,
  termId,
}: ComputeGradesInput) {

  return prisma.$transaction(async (tx) => {

    /**
     * 1. Get all SUBMITTED assessments for this subject + class + term
     */
    const assessments = await tx.assessment.findMany({
      where: {
        subjectId,
        classId,
        termId,
        status: "SUBMITTED",
      },
      select: {
        id: true,
        maxScore: true,
        weight: true,
      },
    });

    console.log("ASSESSMENTS FOUND:", assessments.length);

    if (assessments.length === 0) {
      console.log("⚠️ No submitted assessments found. Grade computation skipped.");
      return;
    }

    /**
     * 2. Get students in this class
     */
    const students = await tx.student.findMany({
      where: { classId },
      select: { id: true },
    });

    console.log("STUDENTS FOUND:", students.length);

    if (students.length === 0) {
      console.log("⚠️ No students found in class. Grade computation skipped.");
      return;
    }

    /**
     * 3. Fetch scores
     */
    const assessmentIds = assessments.map((a) => a.id);

    const scores = await tx.assessmentScore.findMany({
      where: {
        assessmentId: { in: assessmentIds },
        student: { classId },
      },
      select: {
        assessmentId: true,
        studentId: true,
        score: true,
      },
    });

    console.log("SCORES FOUND:", scores.length);

    if (scores.length === 0) {
      console.log("⚠️ No scores found for these assessments.");
    }

    /**
     * 4. Build lookup maps
     */
    const assessmentMap = new Map(
      assessments.map((a) => [
        a.id,
        { maxScore: a.maxScore, weight: a.weight },
      ])
    );

    const scoresByStudent = new Map<number, typeof scores>();

    for (const s of scores) {
      if (!scoresByStudent.has(s.studentId)) {
        scoresByStudent.set(s.studentId, []);
      }
      scoresByStudent.get(s.studentId)!.push(s);
    }

    /**
     * 5. Compute grades
     */
    for (const student of students) {

      const studentScores = scoresByStudent.get(student.id) || [];

      let totalWeighted = 0;
      let totalWeight = 0;

      for (const s of studentScores) {

        const meta = assessmentMap.get(s.assessmentId);
        if (!meta) continue;

        const normalized = s.score / meta.maxScore;

        totalWeighted += normalized * meta.weight;
        totalWeight += meta.weight;
      }

      if (totalWeight === 0) {
        console.log(`⚠️ Student ${student.id} has no valid scores.`);
        continue;
      }

      const average = totalWeighted / totalWeight;
      const total = average * 100;

      await tx.grade.upsert({
        where: {
          studentId_subjectId_termId: {
            studentId: student.id,
            subjectId,
            termId,
          },
        },
        update: {
          total,
          average,
        },
        create: {
          studentId: student.id,
          subjectId,
          termId,
          total,
          average,
        },
      });

      console.log(`✅ Grade computed for student ${student.id}: ${total.toFixed(2)}`);
    }

    console.log("🎯 Grade computation completed for subject:", subjectId);

  });

}