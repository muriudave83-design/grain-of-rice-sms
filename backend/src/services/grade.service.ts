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
  /**
   * 1. Get all SUBMITTED assessments for this subject + term
   */
  const assessments = await prisma.assessment.findMany({
    where: {
      subjectId,
      termId,
      status: "SUBMITTED",
    },
    select: {
      id: true,
      maxScore: true,
      weight: true,
    },
  });

  if (assessments.length === 0) {
    return; // nothing to compute yet
  }

  /**
   * 2. Get all students in this class
   */
  const students = await prisma.student.findMany({
    where: { classId },
    select: { id: true },
  });

  if (students.length === 0) {
    return;
  }

  /**
   * 3. Fetch all scores for these assessments
   */
  const assessmentIds = assessments.map((a) => a.id);

  const scores = await prisma.assessmentScore.findMany({
    where: {
      assessmentId: { in: assessmentIds },
    },
    select: {
      assessmentId: true,
      studentId: true,
      score: true,
    },
  });

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
   * 5. Compute and UPSERT grades
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

    if (totalWeight === 0) continue;

    const average = totalWeighted / totalWeight;
    const total = average * 100;

    await prisma.grade.upsert({
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
  }
}
