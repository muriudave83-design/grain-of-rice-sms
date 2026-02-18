import { prisma } from "../prisma/client";

export const getMissingAssignmentsForStudent = async (studentId: number) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: { subject: true },
  });

  const missing: any[] = [];

  for (const enroll of enrollments) {
    const assessments = await prisma.assessment.findMany({
      where: {
        subjectId: enroll.subjectId,
        isPublished: true,
      },
    });

    for (const a of assessments) {
      const score = await prisma.assessmentScore.findUnique({
        where: {
          assessmentId_studentId: {
            assessmentId: a.id,
            studentId,
          },
        },
      });

      if (!score) {
        missing.push({
          subject: enroll.subject.name,
          assessmentTitle: a.title,
          date: a.date,
        });
      }
    }
  }

  return missing;
};
