import { Prisma } from "@prisma/client";

export class TeacherSubjectHandoverError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function createTeacherSubjectHandover(client: any, input: {
  originalTeacherSubjectId: number; replacementTeacherSubjectId: number;
  termId: number; createdByAdminId: number; note?: string;
}) {
  return client.$transaction(async (tx: any) => {
    const [original, replacement, term] = await Promise.all([
      tx.teacherSubject.findUnique({ where: { id: input.originalTeacherSubjectId } }),
      tx.teacherSubject.findUnique({ where: { id: input.replacementTeacherSubjectId } }),
      tx.term.findUnique({ where: { id: input.termId } }),
    ]);
    if (!original || !replacement || !term) throw new TeacherSubjectHandoverError(404, "Teacher assignment or term not found");
    if (original.id === replacement.id || original.teacherId === replacement.teacherId) {
      throw new TeacherSubjectHandoverError(409, "Original and replacement teachers must be different");
    }
    if (original.classId !== replacement.classId || original.subjectId !== replacement.subjectId) {
      throw new TeacherSubjectHandoverError(409, "Teacher assignments must match the exact class and subject");
    }
    if (term.classId !== original.classId) throw new TeacherSubjectHandoverError(409, "Term must belong to the handover class");
    if (!replacement.isActive) throw new TeacherSubjectHandoverError(409, "Replacement teacher assignment must be active");
    try {
      const grant = await tx.teacherSubjectHandover.create({ data: {
        originalTeacherSubjectId: original.id,
        replacementTeacherSubjectId: replacement.id,
        originalTeacherId: original.teacherId,
        replacementTeacherId: replacement.teacherId,
        classId: original.classId,
        subjectId: original.subjectId,
        termId: term.id,
        createdByAdminId: input.createdByAdminId,
        note: input.note?.trim() || null,
      }});
      const hasHistoricalAssignments = await tx.assignment.findFirst({ where: {
        teacherSubjectId: original.id, termId: term.id,
      }, select: { id: true } });
      if (hasHistoricalAssignments) {
        await tx.gradeContributionScope.upsert({
          where: { classId_subjectId_termId: { classId: original.classId, subjectId: original.subjectId, termId: term.id } },
          update: { mode: "REVIEWING", activatedAt: null, revision: { increment: 1 } },
          create: { classId: original.classId, subjectId: original.subjectId, termId: term.id, mode: "REVIEWING" },
        });
      }
      return grant;
    } catch (error: any) {
      if (error?.code === "P2002") throw new TeacherSubjectHandoverError(409, "An active handover already exists for this exact scope");
      throw error;
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function revokeTeacherSubjectHandover(client: any, id: number, revokedByAdminId: number) {
  return client.$transaction(async (tx: any) => {
    const current = await tx.teacherSubjectHandover.findUnique({ where: { id } });
    if (!current) throw new TeacherSubjectHandoverError(404, "Handover grant not found");
    if (!current.isActive) throw new TeacherSubjectHandoverError(409, "Handover grant is already revoked");
    return tx.teacherSubjectHandover.update({ where: { id }, data: {
      isActive: false, revokedAt: new Date(), revokedByAdminId,
    }});
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export function listTeacherSubjectHandovers(client: any, active?: boolean) {
  return client.teacherSubjectHandover.findMany({
    where: active === undefined ? {} : { isActive: active },
    include: {
      originalTeacher: { select: { id: true, name: true, email: true } },
      replacementTeacher: { select: { id: true, name: true, email: true } },
      class: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } },
      term: { select: { id: true, name: true, academicYear: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function activeHandoverForAssignment(client: any, teacherId: number, assignmentId: number) {
  const assignment = await client.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true, termId: true,
      term: { select: { classId: true } },
      teacherSubject: { select: { id: true, teacherId: true, isActive: true, classId: true, subjectId: true } },
      combinedAssignmentChild: { select: { id: true } },
    },
  });
  if (!assignment) throw new TeacherSubjectHandoverError(404, "Assignment not found");
  if (assignment.term.classId !== assignment.teacherSubject.classId) {
    throw new TeacherSubjectHandoverError(409, "Assignment term does not match its class");
  }
  if (assignment.teacherSubject.teacherId === teacherId && assignment.teacherSubject.isActive) {
    return { assignment, access: "OWNER" as const };
  }
  if (assignment.combinedAssignmentChild) {
    throw new TeacherSubjectHandoverError(403, "Combined teaching-group assignments require combined-group permission");
  }
  const grant = await client.teacherSubjectHandover.findFirst({ where: {
    originalTeacherSubjectId: assignment.teacherSubject.id,
    originalTeacherId: assignment.teacherSubject.teacherId,
    replacementTeacherId: teacherId,
    classId: assignment.teacherSubject.classId,
    subjectId: assignment.teacherSubject.subjectId,
    termId: assignment.termId,
    isActive: true,
    replacementTeacherSubject: {
      teacherId, classId: assignment.teacherSubject.classId,
      subjectId: assignment.teacherSubject.subjectId, isActive: true,
    },
  }});
  if (!grant) throw new TeacherSubjectHandoverError(403, "No active handover authorizes this assignment");
  return { assignment, grant, access: "HANDOVER" as const };
}

export async function accessibleTeacherSubjectIds(client: any, input: {
  replacementTeacherSubjectId: number; teacherId: number; termId: number;
}) {
  const replacement = await client.teacherSubject.findFirst({ where: {
    id: input.replacementTeacherSubjectId, teacherId: input.teacherId, isActive: true,
    class: { isArchived: false },
  }});
  if (!replacement) throw new TeacherSubjectHandoverError(404, "Teacher assignment not found");
  const term = await client.term.findFirst({ where: { id: input.termId, classId: replacement.classId } });
  if (!term) throw new TeacherSubjectHandoverError(404, "Term not found for this class");
  const grants = await client.teacherSubjectHandover.findMany({ where: {
    replacementTeacherSubjectId: replacement.id,
    replacementTeacherId: input.teacherId,
    classId: replacement.classId,
    subjectId: replacement.subjectId,
    termId: term.id,
    isActive: true,
  }, select: { originalTeacherSubjectId: true } });
  return { replacement, term, teacherSubjectIds: [replacement.id, ...grants.map((g: any) => g.originalTeacherSubjectId)] };
}
