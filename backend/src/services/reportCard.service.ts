import { prisma } from "../prisma/client";

type GenerateReportCardsInput = {
  classId: number;
  termId: number;
};

export async function generateReportCardsForClass({
  classId,
  termId,
}: GenerateReportCardsInput) {
  /**
   * 1. Fetch all students in class
   */
  const students = await prisma.student.findMany({
    where: { classId },
    select: { id: true },
  });

  if (students.length === 0) {
    return { generated: 0 };
  }

  const studentIds = students.map((s) => s.id);

  /**
   * 2. Fetch all grades for this class + term
   */
  const grades = await prisma.grade.findMany({
    where: {
      studentId: { in: studentIds },
      termId,
    },
  });

  if (grades.length === 0) {
    return { generated: 0 };
  }

  /**
   * 3. Group grades per student
   */
  const gradesByStudent = new Map<number, typeof grades>();

  for (const g of grades) {
    if (!gradesByStudent.has(g.studentId)) {
      gradesByStudent.set(g.studentId, []);
    }
    gradesByStudent.get(g.studentId)!.push(g);
  }

  let generatedCount = 0;

  /**
   * 4. Generate report card per student
   */
  for (const student of students) {
    const studentGrades = gradesByStudent.get(student.id);

    if (!studentGrades || studentGrades.length === 0) {
      continue;
    }

    /**
     * Do not regenerate if already PUBLISHED
     */
    const existing = await prisma.reportCard.findUnique({
      where: {
        studentId_termId: {
          studentId: student.id,
          termId,
        },
      },
      include: { subjects: true },
    });

    if (existing && existing.status === "PUBLISHED") {
      continue;
    }

    /**
     * Compute totals
     */
    const total = studentGrades.reduce(
      (sum, g) => sum + g.total,
      0
    );
    const average = total / studentGrades.length;

    /**
     * Upsert ReportCard
     */
    const reportCard = await prisma.reportCard.upsert({
      where: {
        studentId_termId: {
          studentId: student.id,
          termId,
        },
      },
      update: {
        total,
        average,
        status: "GENERATED",
      },
      create: {
        studentId: student.id,
        classId,
        termId,
        total,
        average,
        status: "GENERATED",
      },
    });

    /**
     * Clear old subject entries (safe before publish)
     */
    await prisma.reportCardSubjectEntry.deleteMany({
      where: { reportCardId: reportCard.id },
    });

    /**
     * Insert subject breakdown
     */
    for (const g of studentGrades) {
      await prisma.reportCardSubjectEntry.create({
        data: {
          reportCardId: reportCard.id,
          subjectId: g.subjectId,
          total: g.total,
          average: g.average,
        },
      });
    }

    generatedCount++;
  }

  return { generated: generatedCount };
}
