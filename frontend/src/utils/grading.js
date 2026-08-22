export const GRADE_DESCRIPTIONS = Object.freeze({
  A: "Exceeding Expectations", "A-": "Exceeding Expectations",
  "B+": "Meeting Expectations", B: "Meeting Expectations", "B-": "Meeting Expectations",
  "C+": "Approaching Expectations", C: "Approaching Expectations", "C-": "Approaching Expectations",
  "D+": "Below Expectations", D: "Below Expectations", "D-": "Below Expectations",
  F: "Below Expectations",
});

export function getGradeDescription(grade) {
  if (typeof grade !== "string") return null;
  return GRADE_DESCRIPTIONS[grade.trim().toUpperCase()] ?? null;
}

export function getLetterGrade(percentage) {
  if (percentage === null || percentage === undefined || percentage === "") return null;
  const score = Number(percentage);
  if (!Number.isFinite(score) || score < 0 || score > 100) return null;
  if (score >= 94) return "A";
  if (score >= 90) return "A-";
  if (score >= 88) return "B+";
  if (score >= 84) return "B";
  if (score >= 80) return "B-";
  if (score >= 78) return "C+";
  if (score >= 74) return "C";
  if (score >= 70) return "C-";
  if (score >= 68) return "D+";
  if (score >= 64) return "D";
  if (score >= 60) return "D-";
  return "F";
}

export function normalizeGradePercentage(score) {
  const numeric = Number(score);
  return numeric >= 0 && numeric <= 1 ? numeric * 100 : numeric;
}

export function formatGrade(grade, fallback = "—") {
  if (grade === null || grade === undefined || grade === "") return fallback;
  const letter = String(grade).trim().toUpperCase();
  const description = getGradeDescription(letter);
  return description ? `${letter} — ${description}` : String(grade);
}
