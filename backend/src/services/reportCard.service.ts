import { prisma } from "../prisma/client";

type GenerateReportCardsInput = {
  classId: number;
  termId: number;
};

export async function generateReportCardsForClass({
  classId,
  termId,
}: GenerateReportCardsInput) {

  return prisma.$transaction(async (tx) => {

    /**
     * 1. Fetch students in class
     */
    const students = await tx.student.findMany({
      where: { classId },
      select: { id: true },
    });

    if (students.length === 0) {
      return { generated: 0 };
    }

    const studentIds = students.map((s) => s.id);

    /**
     * 2. Fetch grades
     */
    const grades = await tx.grade.findMany({
      where: {
        studentId: { in: studentIds },
        termId,
      },
    });

    if (grades.length === 0) {
      console.log("⚠️ No grades found for report card generation");
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
     * 4. Generate report cards
     */
    for (const student of students) {

      const studentGrades = gradesByStudent.get(student.id);

      if (!studentGrades || studentGrades.length === 0) {
        continue;
      }

      /**
       * Check existing report card
       */
      const existing = await tx.reportCard.findUnique({
        where: {
          studentId_termId: {
            studentId: student.id,
            termId,
          },
        },
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
       * Upsert report card
       */
      const reportCard = await tx.reportCard.upsert({
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
       * Remove old subject entries
       */
      await tx.reportCardSubjectEntry.deleteMany({
        where: { reportCardId: reportCard.id },
      });

      /**
       * Batch insert subject entries
       */
      await tx.reportCardSubjectEntry.createMany({
        data: studentGrades.map((g) => ({
          reportCardId: reportCard.id,
          subjectId: g.subjectId,
          total: g.total,
          average: g.average,
        })),
      });

      generatedCount++;
    }

    console.log(`✅ Generated ${generatedCount} report cards`);

    return { generated: generatedCount };

  });

}