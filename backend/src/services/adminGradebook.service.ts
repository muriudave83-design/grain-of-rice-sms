export async function listAdminGradebookClasses(client: any) {
  return client.class.findMany({
    where: { isArchived: false },
    select: { id: true, name: true, level: true },
    orderBy: { name: "asc" },
  });
}

export async function getAdminGradebookOptions(client: any, classId: number) {
  const schoolClass = await client.class.findFirst({
    where: { id: classId, isArchived: false },
    select: { id: true, name: true, level: true },
  });
  if (!schoolClass) return null;

  const [classSubjects, terms, teacherSubjects] = await Promise.all([
    client.classSubject.findMany({
      where: { classId, subject: { isArchived: false } },
      select: { subject: { select: { id: true, name: true, code: true } } },
      orderBy: { subject: { name: "asc" } },
    }),
    client.term.findMany({
      where: { classId },
      select: { id: true, name: true, academicYear: true, isActive: true, isLocked: true },
      orderBy: [{ academicYear: "desc" }, { startDate: "desc" }],
    }),
    client.teacherSubject.findMany({
      where: { classId, class: { isArchived: false }, subject: { isArchived: false } },
      select: {
        id: true,
        subjectId: true,
        teacherId: true,
        isActive: true,
        teacher: { select: { id: true, name: true, isActive: true, isArchived: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ subject: { name: "asc" } }, { isActive: "desc" }, { id: "desc" }],
    }),
  ]);

  return {
    class: schoolClass,
    subjects: classSubjects.map((entry: any) => entry.subject),
    terms,
    teacherSubjects,
  };
}

export async function getAdminGradebook(client: any, teacherSubjectId: number, termId: number) {
  const teacherSubject = await client.teacherSubject.findFirst({
    where: { id: teacherSubjectId, class: { isArchived: false }, subject: { isArchived: false } },
    select: {
      id: true,
      teacherId: true,
      subjectId: true,
      classId: true,
      isActive: true,
      teacher: { select: { id: true, name: true, isActive: true, isArchived: true } },
      subject: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, name: true, level: true } },
    },
  });
  if (!teacherSubject) return null;

  const term = await client.term.findFirst({
    where: { id: termId, classId: teacherSubject.classId },
    select: { id: true, name: true, academicYear: true, isActive: true, isLocked: true },
  });
  if (!term) return null;

  const [students, assignments] = await Promise.all([
    client.student.findMany({
      where: { classId: teacherSubject.classId, isArchived: false },
      select: { id: true, admissionNo: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    client.assignment.findMany({
      where: { teacherSubjectId, termId },
      select: {
        id: true,
        teacherSubjectId: true,
        title: true,
        maxPoints: true,
        isLocked: true,
        gradeContributionStatus: true,
        gradeContributionNote: true,
        gradeContributionReviewedAt: true,
        position: true,
        scores: {
          where: { student: { classId: teacherSubject.classId, isArchived: false } },
          select: { id: true, studentId: true, assignmentId: true, score: true, maxPoints: true },
        },
      },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    }),
  ]);

  return { teacherSubject, term, students, assignments };
}

export async function getContributionReview(client: any, classId: number, subjectId: number, termId: number) {
  const [scope, assignments] = await Promise.all([
    client.gradeContributionScope.findUnique({
      where: { classId_subjectId_termId: { classId, subjectId, termId } },
    }),
    client.assignment.findMany({
      where: { termId, teacherSubject: { classId, subjectId } },
      select: {
        id: true,
        title: true,
        teacherSubjectId: true,
        gradeContributionStatus: true,
        gradeContributionNote: true,
        gradeContributionReviewedAt: true,
        teacherSubject: { select: { teacher: { select: { id: true, name: true } } } },
        _count: { select: { scores: true } },
      },
      orderBy: [{ teacherSubjectId: "asc" }, { position: "asc" }, { id: "asc" }],
    }),
  ]);
  return {
    scope,
    assignments: assignments.map(({ _count, ...assignment }: any) => ({
      ...assignment,
      scoreCount: _count.scores,
    })),
  };
}

export async function reviewAssignmentContribution(client: any, input: {
  assignmentId: number; status: "UNREVIEWED" | "INCLUDED" | "EXCLUDED";
  note?: string; expectedReviewedAt?: string | null; actorUserId: number;
}) {
  if (!["UNREVIEWED", "INCLUDED", "EXCLUDED"].includes(input.status)) throw Object.assign(new Error("Invalid contribution status"), { status: 400 });
  if (input.status === "EXCLUDED" && !String(input.note ?? "").trim()) throw Object.assign(new Error("A reason is required to exclude an assignment"), { status: 400 });
  return client.$transaction(async (tx: any) => {
    const assignment = await tx.assignment.findUnique({
      where: { id: input.assignmentId },
      include: { teacherSubject: true, scores: { select: { id: true } } },
    });
    if (!assignment) throw Object.assign(new Error("Assignment not found"), { status: 404 });
    const currentToken = assignment.gradeContributionReviewedAt?.toISOString() ?? null;
    if (currentToken !== (input.expectedReviewedAt ?? null)) throw Object.assign(new Error("Assignment review changed; refresh and try again"), { status: 409 });
    const reviewedAt = new Date();
    const changed = await tx.assignment.updateMany({ where: {
      id: assignment.id,
      gradeContributionReviewedAt: assignment.gradeContributionReviewedAt,
    }, data: {
      gradeContributionStatus: input.status,
      gradeContributionNote: String(input.note ?? "").trim() || null,
      gradeContributionReviewedAt: reviewedAt,
    }});
    if (changed.count !== 1) throw Object.assign(new Error("Assignment review changed; refresh and try again"), { status: 409 });
    const updated = await tx.assignment.findUniqueOrThrow({ where: { id: assignment.id } });
    const scope = await tx.gradeContributionScope.upsert({
      where: { classId_subjectId_termId: { classId: assignment.teacherSubject.classId, subjectId: assignment.teacherSubject.subjectId, termId: assignment.termId } },
      update: { revision: { increment: 1 }, mode: "REVIEWING", activatedAt: null },
      create: { classId: assignment.teacherSubject.classId, subjectId: assignment.teacherSubject.subjectId, termId: assignment.termId, mode: "REVIEWING" },
    });
    await tx.auditLog.create({ data: {
      actorUserId: String(input.actorUserId), actorRole: "ADMIN", action: "ASSIGNMENT_GRADE_CONTRIBUTION_REVIEWED",
      entityType: "Assignment", entityId: String(assignment.id), metadata: {
        previousStatus: assignment.gradeContributionStatus, status: input.status, note: input.note ?? null,
        classId: assignment.teacherSubject.classId, subjectId: assignment.teacherSubject.subjectId,
        termId: assignment.termId, scoreCount: assignment.scores.length, scopeRevision: scope.revision,
      },
    }});
    return { ...updated, scores: assignment.scores, scope };
  });
}

export async function activateContributionScope(client: any, input: { classId: number; subjectId: number; termId: number; actorUserId: number }) {
  return client.$transaction(async (tx: any) => {
    const assignments = await tx.assignment.findMany({
      where: { termId: input.termId, teacherSubject: { classId: input.classId, subjectId: input.subjectId } },
      select: { id: true, gradeContributionStatus: true },
    });
    const unreviewed = assignments.filter((item: any) => item.gradeContributionStatus === "UNREVIEWED").map((item: any) => item.id);
    if (unreviewed.length) throw Object.assign(new Error(`Assignments require review: ${unreviewed.join(", ")}`), { status: 409, details: { unreviewed } });
    if (!assignments.some((item: any) => item.gradeContributionStatus === "INCLUDED")) throw Object.assign(new Error("At least one assignment must be included"), { status: 409 });
    const scope = await tx.gradeContributionScope.upsert({
      where: { classId_subjectId_termId: { classId: input.classId, subjectId: input.subjectId, termId: input.termId } },
      update: { mode: "ACTIVE", activatedAt: new Date() },
      create: { classId: input.classId, subjectId: input.subjectId, termId: input.termId, mode: "ACTIVE", activatedAt: new Date() },
    });
    await tx.auditLog.create({ data: { actorUserId: String(input.actorUserId), actorRole: "ADMIN", action: "GRADE_CONTRIBUTION_SCOPE_ACTIVATED", entityType: "GradeContributionScope", entityId: String(scope.id), metadata: input } });
    return scope;
  });
}
