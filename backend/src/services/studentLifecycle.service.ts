import { StudentClassEnrollmentStatus } from "@prisma/client";

const failure = (message: string, status: number) => Object.assign(new Error(message), { status });

export function historyPagination(query: { page?: unknown; pageSize?: unknown }) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export async function archiveStudent(client: any, studentId: number, now = new Date()) {
  return client.$transaction(async (tx: any) => {
    const student = await tx.student.findUnique({ where: { id: studentId }, include: { class: true } });
    if (!student || student.isArchived) throw failure("Active student not found", 404);
    if (!student.classId || !student.class || student.class.isArchived) throw failure("Student has no active current class", 409);
    const current = await tx.studentClassEnrollment.findFirst({ where: { studentId, status: StudentClassEnrollmentStatus.CURRENT } });
    if (!current || current.classId !== student.classId) throw failure("Current enrollment is inconsistent", 409);
    await tx.studentClassEnrollment.update({ where: { id: current.id }, data: { status: StudentClassEnrollmentStatus.HISTORICAL, endedAt: now } });
    if (student.userId) await tx.user.update({ where: { id: student.userId }, data: { isArchived: true, isActive: false } });
    return tx.student.update({ where: { id: studentId }, data: { isArchived: true, archivedAt: now } });
  });
}

export async function restoreStudent(client: any, studentId: number, classId: number, now = new Date()) {
  return client.$transaction(async (tx: any) => {
    const [student, destination, current] = await Promise.all([tx.student.findUnique({ where: { id: studentId } }), tx.class.findFirst({ where: { id: classId, isArchived: false } }), tx.studentClassEnrollment.findFirst({ where: { studentId, status: StudentClassEnrollmentStatus.CURRENT } })]);
    if (!student?.isArchived) throw failure("Archived student not found", 404);
    if (!destination) throw failure("Select an active class", 400);
    if (current) throw failure("Student already has a current enrollment", 409);
    await tx.studentClassEnrollment.create({ data: { studentId, classId, classNameSnapshot: destination.name, startedAt: now, status: StudentClassEnrollmentStatus.CURRENT, source: "RESTORE" } });
    if (student.userId) await tx.user.update({ where: { id: student.userId }, data: { isArchived: false, isActive: true } });
    return tx.student.update({ where: { id: studentId }, data: { classId, isArchived: false, archivedAt: null } });
  });
}

export async function transferStudent(client: any, studentId: number, classId: number, now = new Date()) {
  return client.$transaction(async (tx: any) => {
    const [student, destination, current] = await Promise.all([tx.student.findUnique({ where: { id: studentId } }), tx.class.findFirst({ where: { id: classId, isArchived: false } }), tx.studentClassEnrollment.findFirst({ where: { studentId, status: StudentClassEnrollmentStatus.CURRENT } })]);
    if (!student || student.isArchived) throw failure("Active student not found", 404);
    if (!destination) throw failure("Destination class must be active", 400);
    if (!current || current.classId !== student.classId) throw failure("Current enrollment is inconsistent", 409);
    if (student.classId === classId) return student;
    await tx.studentClassEnrollment.update({ where: { id: current.id }, data: { status: StudentClassEnrollmentStatus.HISTORICAL, endedAt: now } });
    await tx.studentClassEnrollment.create({ data: { studentId, classId, classNameSnapshot: destination.name, startedAt: now, status: StudentClassEnrollmentStatus.CURRENT, source: "TRANSFER" } });
    return tx.student.update({ where: { id: studentId }, data: { classId } });
  });
}
