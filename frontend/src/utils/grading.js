export const GRADE_DESCRIPTIONS = Object.freeze({
  A: "Exceedingly Expectations",
  B: "Meeting Expectations",
  C: "Approaching Expectations",
  D: "Below Expectations",
  F: "Below Expectations",
});

export function getGradeDescription(grade) {
  if (typeof grade !== "string") return null;
  return GRADE_DESCRIPTIONS[grade.trim().toUpperCase()] ?? null;
}

export function getLetterGrade(score) {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return null;
  const numericScore = Number(score);
  const value = numericScore >= 0 && numericScore <= 1 ? numericScore * 100 : numericScore;
  if (value >= 80) return "A";
  if (value >= 70) return "B";
  if (value >= 60) return "C";
  if (value >= 50) return "D";
  return "F";
}

export function formatGrade(grade, fallback = "—") {
  if (grade === null || grade === undefined || grade === "") return fallback;
  const letter = String(grade).trim().toUpperCase();
  const description = getGradeDescription(letter);
  return description ? `${letter} — ${description}` : String(grade);
}
