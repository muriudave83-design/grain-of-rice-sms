export type PointsAssignment = {
  weight?: number | null;
  maxPoints?: number | null;
  scores: Array<{ studentId: number; score: number | null }>;
};

export function calculatePointsPercentage(studentId: number, assignments: PointsAssignment[]) {
  if (!assignments.length) return null;
  let earned = 0;
  let possible = 0;
  let contributing = 0;
  for (const assignment of assignments) {
    const weight = Number(assignment.weight ?? 1);
    if (!Number.isFinite(weight) || weight < 0) return null;
    if (weight === 0) continue;
    const score = assignment.scores.find((entry) => entry.studentId === studentId)?.score;
    const maxPoints = Number(assignment.maxPoints ?? 100);
    if (score === null || score === undefined || !Number.isFinite(Number(score)) ||
        !Number.isFinite(maxPoints) || maxPoints <= 0) return null;
    earned += Number(score);
    possible += maxPoints;
    contributing += 1;
  }
  return contributing > 0 && possible > 0 ? (earned / possible) * 100 : null;
}
