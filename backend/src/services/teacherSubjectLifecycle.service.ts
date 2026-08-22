export async function setTeacherSubjectActive(client: any, id: number, isActive: boolean) {
  return client.$transaction(async (tx: any) => {
    const assignment = await tx.teacherSubject.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, isActive: true, isArchived: true, role: true } },
        subject: { select: { id: true, isArchived: true } },
        class: { select: { id: true, isArchived: true } },
      },
    });
    if (!assignment) return { status: "NOT_FOUND" as const };
    if (assignment.isActive === isActive) {
      return { status: "UNCHANGED" as const, assignment };
    }
    if (isActive && (
      assignment.teacher.role !== "TEACHER" ||
      !assignment.teacher.isActive || assignment.teacher.isArchived ||
      assignment.subject.isArchived || assignment.class.isArchived
    )) {
      return { status: "INVALID_STRUCTURE" as const };
    }
    const updated = await tx.teacherSubject.update({ where: { id }, data: { isActive } });
    return { status: "UPDATED" as const, assignment: updated };
  });
}
