import { loadAuthoritativeReportResults } from "./authoritativeReport.service";

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
export async function getReportPrintingApprovalOverview(client: any) {
  const [assignments, scopes] = await Promise.all([client.assignment.findMany({
    select: {
      id: true, title: true, maxPoints: true, weight: true, termId: true,
      gradeContributionStatus: true, gradeContributionNote: true, gradeContributionReviewedAt: true,
      teacherSubject: {
        select: {
          classId: true, subjectId: true,
          class: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
          teacher: { select: { id: true, name: true } },
        },
      },
      term: { select: { id: true, name: true, academicYear: true } },
      _count: { select: { scores: true } },
    },
    orderBy: [{ term: { academicYear: "desc" } }, { teacherSubject: { class: { name: "asc" } } }, { teacherSubject: { subject: { name: "asc" } } }, { id: "asc" }],
  }), client.gradeContributionScope.findMany({ select: { classId: true, subjectId: true, termId: true, mode: true } })]);
  const rows = assignments.map(({ _count, ...assignment }: any) => ({
    ...assignment,
    scoreCount: _count.scores,
    safeToInclude: Number.isFinite(assignment.maxPoints) && assignment.maxPoints > 0 && _count.scores > 0,
    safetyWarnings: [
      ...(_count.scores === 0 ? ["NO_RECORDED_SCORES"] : []),
      ...(!Number.isFinite(assignment.maxPoints) || assignment.maxPoints <= 0 ? ["INVALID_MAX_POINTS"] : []),
      ...(assignment.gradeContributionStatus === "EXCLUDED" ? ["PREVIOUSLY_EXCLUDED"] : []),
    ],
  }));
  const relevantPairs = [...new Map(rows
    .filter((row: any) => row.gradeContributionStatus === "UNREVIEWED")
    .map((row: any) => [`${row.teacherSubject.classId}:${row.termId}`, { classId: row.teacherSubject.classId, termId: row.termId, className: row.teacherSubject.class.name, term: row.term }])).values()];
  const students = await client.student.findMany({
    where: { classId: { in: relevantPairs.map((pair: any) => pair.classId) }, isArchived: false },
    select: { id: true, classId: true },
  });
  const readiness = await Promise.all(relevantPairs.map(async (pair: any) => {
    const studentIds = students.filter((student: any) => student.classId === pair.classId).map((student: any) => student.id);
    const { resultsByStudent } = await loadAuthoritativeReportResults(client, { classId: pair.classId, termId: pair.termId, studentIds });
    const subjects = [...resultsByStudent.values()].flat();
    const reviewPending = subjects.some((subject: any) => subject.completenessState === "REVIEW_REQUIRED");
    const incompleteMarks = subjects.some((subject: any) => subject.completenessState === "INCOMPLETE" || subject.completenessState === "NO_INCLUDED_ASSIGNMENTS");
    return { ...pair, studentCount: studentIds.length, reviewPending, incompleteMarks, status: reviewPending ? "ASSIGNMENT_REVIEW_PENDING" : incompleteMarks ? "REQUIRED_MARKS_INCOMPLETE" : "READY_TO_PRINT" };
  }));
  const groups = [...new Map(rows.map((row: any) => {
    const key = `${row.teacherSubject.classId}:${row.teacherSubject.subjectId}:${row.termId}`;
    return [key, { classId: row.teacherSubject.classId, className: row.teacherSubject.class.name, subjectId: row.teacherSubject.subjectId, subjectName: row.teacherSubject.subject.name, termId: row.termId, term: row.term, assignments: [] as any[] }];
  })).values()];
  for (const group of groups as any[]) {
    group.assignments = rows.filter((row: any) => row.teacherSubject.classId === group.classId && row.teacherSubject.subjectId === group.subjectId && row.termId === group.termId);
    group.unreviewed = group.assignments.filter((row: any) => row.gradeContributionStatus === "UNREVIEWED").length;
    group.included = group.assignments.filter((row: any) => row.gradeContributionStatus === "INCLUDED").length;
    group.mode = scopes.find((scope: any) => scope.classId === group.classId && scope.subjectId === group.subjectId && scope.termId === group.termId)?.mode ?? null;
  }
  return {
    totals: {
      unreviewed: rows.filter((row: any) => row.gradeContributionStatus === "UNREVIEWED").length,
      included: rows.filter((row: any) => row.gradeContributionStatus === "INCLUDED").length,
      excluded: rows.filter((row: any) => row.gradeContributionStatus === "EXCLUDED").length,
    },
    assignments: rows,
    groups,
    readiness,
  };
}

export async function bulkIncludeAssignmentContributions(client: any, input: { assignmentIds: number[]; actorUserId: number }) {
  const assignmentIds = [...new Set(input.assignmentIds.map(Number))];
  if (!assignmentIds.length || assignmentIds.length > 500 || assignmentIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw Object.assign(new Error("Select between 1 and 500 valid assignments"), { status: 400 });
  }
  return client.$transaction(async (tx: any) => {
    const assignments = await tx.assignment.findMany({
      where: { id: { in: assignmentIds } },
      include: { teacherSubject: true, scores: { select: { id: true } } },
    });
    if (assignments.length !== assignmentIds.length) throw Object.assign(new Error("One or more selected assignments do not exist"), { status: 409 });
    const unsafe = assignments.filter((assignment: any) =>
      assignment.gradeContributionStatus === "EXCLUDED" ||
      !Number.isFinite(assignment.maxPoints) || assignment.maxPoints <= 0 ||
      assignment.scores.length === 0
    );
    if (unsafe.length) throw Object.assign(new Error("Selection contains assignments requiring individual review"), { status: 409, details: { assignmentIds: unsafe.map((item: any) => item.id) } });
    const changed = assignments.filter((assignment: any) => assignment.gradeContributionStatus === "UNREVIEWED");
    const invalidStatuses = assignments.filter((assignment: any) => !["UNREVIEWED", "INCLUDED"].includes(assignment.gradeContributionStatus));
    if (invalidStatuses.length) throw Object.assign(new Error("Selection contains incompatible contribution statuses"), { status: 409 });
    const reviewedAt = new Date();
    if (changed.length) {
      const updated = await tx.assignment.updateMany({
        where: { id: { in: changed.map((item: any) => item.id) }, gradeContributionStatus: "UNREVIEWED" },
        data: { gradeContributionStatus: "INCLUDED", gradeContributionNote: "Bulk-approved for report printing", gradeContributionReviewedAt: reviewedAt },
      });
      if (updated.count !== changed.length) throw Object.assign(new Error("Assignment review changed; refresh and try again"), { status: 409 });
      const scopes = [...new Map(changed.map((assignment: any) => {
        const key = { classId: assignment.teacherSubject.classId, subjectId: assignment.teacherSubject.subjectId, termId: assignment.termId };
        return [`${key.classId}:${key.subjectId}:${key.termId}`, key];
      })).values()];
      for (const scope of scopes as any[]) await tx.gradeContributionScope.upsert({
        where: { classId_subjectId_termId: scope },
        update: { revision: { increment: 1 }, mode: "REVIEWING", activatedAt: null },
        create: { ...scope, mode: "REVIEWING" },
      });
      for (const assignment of changed) await tx.auditLog.create({ data: {
        actorUserId: String(input.actorUserId), actorRole: "ADMIN", action: "ASSIGNMENT_GRADE_CONTRIBUTION_REVIEWED",
        entityType: "Assignment", entityId: String(assignment.id), metadata: {
          previousStatus: "UNREVIEWED", status: "INCLUDED", method: "BULK_REPORT_PRINTING_APPROVAL",
          classId: assignment.teacherSubject.classId, subjectId: assignment.teacherSubject.subjectId,
          termId: assignment.termId, scoreCount: assignment.scores.length,
        },
      }});
    }
    return { selected: assignmentIds.length, updated: changed.length, alreadyIncluded: assignmentIds.length - changed.length, requiresActivation: changed.length > 0 };
  });
}
