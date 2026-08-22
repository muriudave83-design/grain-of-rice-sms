import { PrismaClient } from "@prisma/client";

type DisciplineClient = Pick<PrismaClient, "student" | "term" | "discipline">;

const assignedStudentWhere = (teacherId: number) => ({
  class: { teacherSubjects: { some: { teacherId } } },
});

export async function listTeacherDisciplineStudents(client: DisciplineClient, teacherId: number) {
  return client.student.findMany({
    where: { isArchived: false, ...assignedStudentWhere(teacherId) },
    include: { class: { select: { id: true, name: true } } },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { id: "asc" }],
  });
}

export async function findTeacherStudent(
  client: DisciplineClient,
  teacherId: number,
  studentId: number,
  activeOnly = false,
) {
  return client.student.findFirst({
    where: {
      id: studentId,
      ...(activeOnly ? { isArchived: false } : {}),
      ...assignedStudentWhere(teacherId),
    },
    select: { id: true, classId: true, isArchived: true },
  });
}

export async function listTeacherTerms(
  client: DisciplineClient,
  teacherId: number,
  studentId?: number,
) {
  if (studentId !== undefined) {
    const student = await findTeacherStudent(client, teacherId, studentId, true);
    if (!student) return null;
    return client.term.findMany({
      where: { classId: student.classId },
      include: { class: { select: { id: true, name: true } } },
      orderBy: [{ startDate: "desc" }, { id: "desc" }],
    });
  }

  return client.term.findMany({
    where: { class: { teacherSubjects: { some: { teacherId } } } },
    include: { class: { select: { id: true, name: true } } },
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
  });
}

export async function listTeacherDisciplineRecords(client: DisciplineClient, teacherId: number) {
  return client.discipline.findMany({
    where: { student: assignedStudentWhere(teacherId) },
    include: {
      student: { include: { class: { select: { id: true, name: true } } } },
      term: true,
      recordedBy: { select: { id: true, name: true, role: true } },
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });
}

export async function createTeacherDisciplineRecord(
  client: DisciplineClient,
  teacherId: number,
  input: { studentId: number; termId: number; type: string; note?: string },
) {
  const student = await findTeacherStudent(client, teacherId, input.studentId, true);
  if (!student) return { error: "STUDENT_FORBIDDEN" as const };

  const term = await client.term.findFirst({
    where: { id: input.termId, classId: student.classId },
    select: { id: true, isLocked: true },
  });
  if (!term) return { error: "TERM_FORBIDDEN" as const };
  if (term.isLocked) return { error: "TERM_LOCKED" as const };

  const record = await client.discipline.create({
    data: {
      studentId: student.id,
      termId: term.id,
      type: input.type.trim(),
      notes: input.note?.trim() || "",
      recordedById: teacherId,
    },
    include: {
      student: { include: { class: { select: { id: true, name: true } } } },
      term: true,
      recordedBy: { select: { id: true, name: true, role: true } },
    },
  });
  return { record };
}
