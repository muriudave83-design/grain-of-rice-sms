import { Prisma } from "@prisma/client";

export async function removeClassSubjectConfiguration(client: any, id: number) {
  return client.$transaction(async (tx: any) => {
    const classSubject = await tx.classSubject.findUnique({ where: { id } });
    if (!classSubject) return { status: "NOT_FOUND" as const };

    const activeTeacherAssignmentCount = await tx.teacherSubject.count({
      where: {
        classId: classSubject.classId,
        subjectId: classSubject.subjectId,
        isActive: true,
      },
    });
    if (activeTeacherAssignmentCount > 0) {
      return { status: "ACTIVE_ASSIGNMENTS" as const, activeTeacherAssignmentCount };
    }

    await tx.classSubject.delete({ where: { id } });
    return {
      status: "REMOVED" as const,
      classId: classSubject.classId,
      subjectId: classSubject.subjectId,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
