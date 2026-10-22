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

  const totalWeight = weighted.reduce((sum, assignment) => sum + assignment.weight, 0);
  if (totalWeight <= 0) return null;
  return weighted.reduce(
    (sum, assignment) => sum + (assignment.score / assignment.maxPoints) * 100 * assignment.weight,
    0,
  ) / totalWeight;
}
