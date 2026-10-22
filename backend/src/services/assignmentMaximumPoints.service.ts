export class AssignmentMaximumPointsError extends Error {
  constructor(public status: number, message: string, public current?: unknown) {
    super(message);
  }
}

function maximumPoints(value: unknown, label: string) {
  if (value === "" || value === null || value === undefined) {
    throw new AssignmentMaximumPointsError(400, `${label} is required`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AssignmentMaximumPointsError(400, `${label} must be a positive finite number`);
  }
  if (!Number.isInteger(parsed * 100)) {
    throw new AssignmentMaximumPointsError(400, `${label} supports at most two decimal places`);
  }
  return parsed;
}

export async function updateOwnedAssignmentMaximumPoints(client: any, input: {
  assignmentId: number;
  teacherId: number;
  maxPoints: unknown;
  expectedMaxPoints: unknown;
}) {
  if (!Number.isInteger(input.assignmentId) || input.assignmentId <= 0) {
    throw new AssignmentMaximumPointsError(400, "Valid assignment ID required");
  }
  const nextMaxPoints = maximumPoints(input.maxPoints, "Maximum points");
  const expectedMaxPoints = maximumPoints(input.expectedMaxPoints, "expectedMaxPoints");

  return client.$transaction(async (tx: any) => {
    const assignment = await tx.assignment.findFirst({
      where: { id: input.assignmentId, teacherSubject: { teacherId: input.teacherId, isActive: true } },
      select: {
        id: true, maxPoints: true, isLocked: true, termId: true,
        gradeContributionReviewedAt: true,
        term: { select: { isLocked: true, isActive: true } },
        teacherSubject: { select: { classId: true, subjectId: true } },
        combinedAssignmentChild: { select: { id: true } },
      },
    });
    if (!assignment) throw new AssignmentMaximumPointsError(404, "Assignment not found");
    if (assignment.combinedAssignmentChild) {
      throw new AssignmentMaximumPointsError(409, "This assignment belongs to a combined teaching group. Use the combined gradebook.");
    }
    if (assignment.isLocked) throw new AssignmentMaximumPointsError(409, "Assignment is locked");
    if (assignment.term.isLocked || !assignment.term.isActive) {
      throw new AssignmentMaximumPointsError(409, "The Term is locked or inactive");
    }
    if (assignment.maxPoints !== expectedMaxPoints) {
      throw new AssignmentMaximumPointsError(409, "Maximum points changed; refresh and try again", { maxPoints: assignment.maxPoints });
    }

    const scopeKey = {
      classId: assignment.teacherSubject.classId,
      subjectId: assignment.teacherSubject.subjectId,
      termId: assignment.termId,
    };
    const [highest, scope, publishedGrade, protectedReportCard, transcript] = await Promise.all([
      tx.score.aggregate({ where: { assignmentId: assignment.id }, _max: { score: true } }),
      tx.gradeContributionScope.findUnique({ where: { classId_subjectId_termId: scopeKey } }),
      tx.grade.findFirst({ where: { subjectId: scopeKey.subjectId, termId: scopeKey.termId, student: { classId: scopeKey.classId } }, select: { id: true } }),
      tx.reportCard.findFirst({ where: { classId: scopeKey.classId, termId: scopeKey.termId, status: { in: ["GENERATED", "PUBLISHED"] } }, select: { id: true, status: true } }),
      tx.transcript.findFirst({ where: { classId: scopeKey.classId, termId: scopeKey.termId }, select: { id: true } }),
    ]);
    if (publishedGrade || protectedReportCard || transcript) {
      throw new AssignmentMaximumPointsError(409, "Maximum points cannot be changed after grades, report cards, or transcripts have been generated. Use the existing administrative reopening process first.");
    }
    if (scope?.mode === "ACTIVE" || assignment.gradeContributionReviewedAt) {
      throw new AssignmentMaximumPointsError(409, "Maximum points cannot be changed after administrative approval. Ask an administrator to reopen contribution review first.");
    }
    const highestScore = highest._max.score;
    if (highestScore !== null && highestScore !== undefined && nextMaxPoints < Number(highestScore)) {
      throw new AssignmentMaximumPointsError(400, `Maximum points cannot be below the highest recorded score (${highestScore})`);
    }

    const changed = await tx.assignment.updateMany({
      where: { id: assignment.id, maxPoints: expectedMaxPoints, isLocked: false, term: { isLocked: false, isActive: true } },
      data: {
        maxPoints: nextMaxPoints,
        ...(scope ? { gradeContributionStatus: "UNREVIEWED", gradeContributionNote: null, gradeContributionReviewedAt: null } : {}),
      },
    });
    if (changed.count !== 1) {
      throw new AssignmentMaximumPointsError(409, "Assignment changed or was locked; refresh and try again");
    }
    if (scope) {
      await tx.gradeContributionScope.update({
        where: { id: scope.id },
        data: { revision: { increment: 1 }, mode: "REVIEWING", activatedAt: null },
      });
    }
    return tx.assignment.findUniqueOrThrow({ where: { id: assignment.id }, include: { scores: true } });
  }, { isolationLevel: "Serializable" });
}
