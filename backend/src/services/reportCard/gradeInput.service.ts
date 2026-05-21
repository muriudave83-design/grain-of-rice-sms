import { prisma } from "../../prisma/client";

type GradeInputRow = {
  assessmentId: number;
  title: string;
  subjectId: number;
  subjectName: string;
  type: string;
  weight: number;
  maxScore: number;
  score: number | null;
};

export async function fetchGradeInputs(
  studentId: number,
  termId: number,
  classId: number
): Promise<GradeInputRow[]> {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new Error("Invalid student");

    const term = await prisma.term.findUnique({
      where: { id: termId },
    });
    if (!term) throw new Error("Invalid term");

    const classroom = await prisma.class.findUnique({
      where: { id: classId },
    });
    if (!classroom) throw new Error("Invalid class");

    const assessments = await prisma.assessment.findMany({
      where: {
        termId,
        classId,
      },
      include: {
        subject: true,
        scores: {
          where: { studentId },
        },
      },
      orderBy: [
        { subjectId: "asc" },
        { id: "asc" },
      ],
    });

    return assessments.map((a) => {
      if (a.maxScore === 0) {
        throw new Error("Invalid maxScore");
      }

      const scoreRow = a.scores[0];

      return {
        assessmentId: a.id,
        title: a.title,
        subjectId: a.subjectId,
        subjectName: a.subject.name,
        type: a.type,
        weight: a.weight,
        maxScore: a.maxScore,
        score: scoreRow ? scoreRow.score : null,
      };
    });
  } catch (err) {
    throw err;
  }
}

export function computeSubjectFinalScore(
  assessments: {
    weight: number;
    maxScore: number;
    score: number | null;
  }[]
): {
  finalScore: number | null;
  missingScores: boolean;
  status: "ok" | "incomplete";
} {
  if (assessments.length === 0) {
    return {
      finalScore: null,
      missingScores: false,
      status: "incomplete",
    };
  }

  let weightSum = 0;
  for (const a of assessments) {
    if (a.maxScore === 0) throw new Error("Invalid maxScore");
    weightSum += a.weight;
  }

  let normalized = false;
  if (Math.abs(weightSum - 1) > 0.0001) {
    normalized = true;
  }

  let finalScore = 0;
  let missingScores = false;

  for (const a of assessments) {
    const weight = normalized ? a.weight / weightSum : a.weight;

    if (
      a.score === null ||
      a.score === undefined ||
      Number.isNaN(a.score)
    ) {
    missingScores = true;
    continue;
  }

    const percentage = (a.score / a.maxScore) * 100;
    finalScore += percentage * weight;
  }

  finalScore = Math.round(finalScore * 100) / 100;

  return {
    finalScore,
    missingScores,
    status: missingScores ? "incomplete" : "ok",
  };
}

export function computeStudentTotals(
  subjectFinalMap: Record<
    number,
    { finalScore: number | null; status: string; missingScores: boolean }
  >
): {
  total: number | null;
  average: number | null;
  completedSubjects: number;
} {
  let total = 0;
  let completedSubjects = 0;

  for (const subjectId in subjectFinalMap) {
    const entry = subjectFinalMap[subjectId];
    if (entry.status !== "ok" || entry.finalScore === null) continue;

    total += entry.finalScore;
    completedSubjects++;
  }

  if (completedSubjects === 0) {
    return {
      total: null,
      average: null,
      completedSubjects: 0,
    };
  }

  total = Math.round(total * 100) / 100;
  const average = Math.round((total / completedSubjects) * 100) / 100;

  return {
    total,
    average,
    completedSubjects,
  };
}
