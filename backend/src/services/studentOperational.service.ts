import { Prisma, PrismaClient } from "@prisma/client";

type Client = Prisma.TransactionClient | PrismaClient;

export async function getOperationalStudentForUser(client: Client, userId: number) {
  const student = await client.student.findFirst({
    where: { userId, isArchived: false },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      admissionNo: true,
      classId: true,
      class: { select: { id: true, name: true, isArchived: true } },
      classEnrollments: {
        where: { status: "CURRENT" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, classId: true, classNameSnapshot: true, startedAt: true, status: true, source: true },
      },
    },
  });
  if (!student) throw { status: 404, message: "Active Student record not found for this account" };

  const terms = student.classId
    ? await client.term.findMany({
        where: { classId: student.classId },
        orderBy: [{ startDate: "desc" }, { id: "desc" }],
        select: { id: true, name: true, academicYear: true, isActive: true, isLocked: true, startDate: true, endDate: true },
      })
    : [];

  return {
    studentId: student.id,
    name: `${student.firstName} ${student.lastName}`.replace(/\s+/g, " ").trim(),
    admissionNo: student.admissionNo,
    class: student.class,
    currentEnrollment: student.classEnrollments[0] ?? null,
    terms,
    subjects: [],
    overallAverage: null,
    overallGrade: null,
  };
}
