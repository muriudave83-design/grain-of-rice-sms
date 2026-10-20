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
    return {
      status: "PUBLISHED",
      value: input.published.total,
      needsRevalidation: Boolean(
        input.scope !== null &&
        input.published.contributionRevision !== input.scope.revision
      ),
    };
  }
  if (!input.scope) return null;
  if (input.scope.mode === "REVIEWING") {
    return {
      status: "REVIEW_REQUIRED",
      unreviewedAssignmentIds: input.assignments
        .filter((assignment) => assignment.gradeContributionStatus === "UNREVIEWED")
        .map((assignment) => assignment.id),
    };
  }
  return calculateIncludedAssignments(input.studentId, input.assignments);
}
