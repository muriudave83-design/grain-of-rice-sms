export function calculateAssignmentWeightedGrade(studentId, assignments) {
  const weighted = [];
  for (const assignment of assignments || []) {
    const weight = Number(assignment.weight ?? 1);
    if (!Number.isFinite(weight) || weight < 0) return null;
    if (weight === 0) continue;

    const score = assignment.scores?.find(
      (entry) => String(entry.studentId) === String(studentId),
    )?.score;
    const maxPoints = Number(assignment.maxPoints ?? 100);
    if (score === null || score === undefined || score === "" ||
        !Number.isFinite(Number(score)) || !Number.isFinite(maxPoints) || maxPoints <= 0) return null;
    weighted.push({ score: Number(score), maxPoints, weight });
  }

  const earned = weighted.reduce((sum, assignment) => sum + assignment.score, 0);
  const possible = weighted.reduce((sum, assignment) => sum + assignment.maxPoints, 0);
  return possible > 0 ? (earned / possible) * 100 : null;
}
