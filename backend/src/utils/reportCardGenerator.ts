import { prisma } from "../prisma/client";

export async function generateReportCards(termId: number, classId: number) {

  const students = await prisma.student.findMany({
    where: { classId },
  });

  for (const student of students) {

    const reportCard = await prisma.reportCard.upsert({
      where: {
        studentId_termId: {
          studentId: student.id,
          termId: termId,
        },
      },
      update: {},
        create: {
        studentId: student.id,
        termId: termId,
        classId: classId,
        status: "GENERATED",
        average: 0,
        total: 0,
        },
    });

    const grades = await prisma.grade.findMany({
      where: {
        studentId: student.id,
        termId: termId,
      },
    });

    for (const grade of grades) {

      await prisma.reportCardSubjectEntry.upsert({
        where: {
          reportCardId_subjectId: {
            reportCardId: reportCard.id,
            subjectId: grade.subjectId,
          },
        },
        update: {
          average: grade.average,
          total: grade.total,
        },
        create: {
          reportCardId: reportCard.id,
          subjectId: grade.subjectId,
          average: grade.average,
          total: grade.total,
        },
      });
    }

    const entries = await prisma.reportCardSubjectEntry.findMany({
      where: { reportCardId: reportCard.id },
    });

    const total =
      entries.reduce((sum, e) => sum + (e.average ?? 0), 0);

    const average =
      entries.length > 0 ? total / entries.length : 0;

    await prisma.reportCard.update({
      where: { id: reportCard.id },
      data: {
        total,
        average,
        generatedAt: new Date(),
      },
    });

  }
}