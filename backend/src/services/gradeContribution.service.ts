export type ContributionAssignment = {
  id: number;
  weight?: number | null;
  maxPoints?: number | null;
  gradeContributionStatus?: "UNREVIEWED" | "INCLUDED" | "EXCLUDED";
  scores: Array<{ studentId: number; score: number | null }>;
};

export type ContributionScope = { mode: "REVIEWING" | "ACTIVE"; revision: number } | null;

export type ResolvedSubjectGrade =
  | { status: "PUBLISHED"; value: number; needsRevalidation: boolean }
  | { status: "COMPLETE"; value: number; assignmentIds: number[] }
  | { status: "INCOMPLETE"; missingAssignmentIds: number[] }
  | { status: "REVIEW_REQUIRED"; unreviewedAssignmentIds: number[] }
  | { status: "NO_INCLUDED_ASSIGNMENTS" };

export function calculateCurrentAvailableGrade(studentId: number, assignments: ContributionAssignment[]) {
  const available = [...new Map(assignments.map((assignment) => [assignment.id, assignment])).values()];
  if (!available.length) return null;

  let weightedTotal = 0;
  let totalWeight = 0;
  for (const assignment of available) {
    const score = assignment.scores.find((entry) => entry.studentId === studentId)?.score;
    const maxPoints = Number(assignment.maxPoints ?? 100);
    const weight = Number(assignment.weight ?? 1);
    if (score === null || score === undefined || !Number.isFinite(Number(score)) ||
        !Number.isFinite(maxPoints) || maxPoints <= 0 || !Number.isFinite(weight) || weight <= 0) return null;
    weightedTotal += (Number(score) / maxPoints) * 100 * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? weightedTotal / totalWeight : null;
}

export function calculateTeacherReportAssignments(studentId: number, assignments: ContributionAssignment[]): ResolvedSubjectGrade {
  const unique = [...new Map(assignments.map((assignment) => [assignment.id, assignment])).values()];
  if (!unique.length) return { status: "NO_INCLUDED_ASSIGNMENTS" };
  const invalid = unique.filter((assignment) => {
    const score = assignment.scores.find((entry) => entry.studentId === studentId)?.score;
    const maxPoints = Number(assignment.maxPoints ?? 100);
    const weight = Number(assignment.weight ?? 1);
    return score === null || score === undefined || !Number.isFinite(Number(score)) ||
      !Number.isFinite(maxPoints) || maxPoints <= 0 || !Number.isFinite(weight) || weight <= 0;
  });
  if (invalid.length) return { status: "INCOMPLETE", missingAssignmentIds: invalid.map((item) => item.id) };

  const value = calculateCurrentAvailableGrade(studentId, unique);
  return value === null
    ? { status: "INCOMPLETE", missingAssignmentIds: unique.map((item) => item.id) }
    : { status: "COMPLETE", value, assignmentIds: unique.map((item) => item.id) };
}

export function calculateIncludedAssignments(studentId: number, assignments: ContributionAssignment[]): ResolvedSubjectGrade {
  const unique = [...new Map(assignments.map((assignment) => [assignment.id, assignment])).values()];
  const unreviewed = unique.filter((assignment) => assignment.gradeContributionStatus === "UNREVIEWED");
  if (unreviewed.length) return { status: "REVIEW_REQUIRED", unreviewedAssignmentIds: unreviewed.map((item) => item.id) };

  const included = unique.filter((assignment) => assignment.gradeContributionStatus === "INCLUDED");
  if (!included.length) return { status: "NO_INCLUDED_ASSIGNMENTS" };
  const missing = included.filter((assignment) => {
    const score = assignment.scores.find((entry) => entry.studentId === studentId)?.score;
    return score === null || score === undefined || (assignment.maxPoints ?? 100) <= 0;
  });
  if (missing.length) return { status: "INCOMPLETE", missingAssignmentIds: missing.map((item) => item.id) };

  let weightedTotal = 0;
  let totalWeight = 0;
  for (const assignment of included) {
    const score = assignment.scores.find((entry) => entry.studentId === studentId)!.score!;
    const maxPoints = assignment.maxPoints ?? 100;
    const weight = assignment.weight ?? 1;
    weightedTotal += (Number(score) / maxPoints) * 100 * weight;
    totalWeight += weight;
  }
  if (totalWeight <= 0) return { status: "INCOMPLETE", missingAssignmentIds: included.map((item) => item.id) };
  return { status: "COMPLETE", value: weightedTotal / totalWeight, assignmentIds: included.map((item) => item.id) };
}

export function resolveExplicitSubjectGrade(input: {
  studentId: number;
  assignments: ContributionAssignment[];
  scope: ContributionScope;
  published?: { total: number; contributionRevision?: number | null } | null;
}): ResolvedSubjectGrade | null {
  if (input.published) {
    const revisionMismatch = Boolean(
      input.scope !== null &&
      input.published.contributionRevision !== input.scope.revision
    );
    const currentAvailable = revisionMismatch
      ? calculateCurrentAvailableGrade(input.studentId, input.assignments)
      : null;
    const verifiedCurrentValue = currentAvailable !== null &&
      Number(currentAvailable.toFixed(1)) === Number(Number(input.published.total).toFixed(1));
    return {
      status: "PUBLISHED",
      value: input.published.total,
      needsRevalidation: revisionMismatch && !verifiedCurrentValue,
    };
  }
  if (!input.scope) return null;
  return calculateTeacherReportAssignments(input.studentId, input.assignments);
}
