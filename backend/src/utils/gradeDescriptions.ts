export const GRADE_DESCRIPTIONS = {
  A: "Exceeding Expectations", "A-": "Exceeding Expectations",
  "B+": "Meeting Expectations", B: "Meeting Expectations", "B-": "Meeting Expectations",
  "C+": "Approaching Expectations", C: "Approaching Expectations", "C-": "Approaching Expectations",
  "D+": "Below Expectations", D: "Below Expectations", "D-": "Below Expectations",
  F: "Below Expectations",
} as const;

export type LetterGrade = keyof typeof GRADE_DESCRIPTIONS;

export function getLetterGrade(percentage: unknown): LetterGrade | null {
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

export function normalizeGradePercentage(score: number) {
  return score >= 0 && score <= 1 ? score * 100 : score;
}

export function getGradeDescription(grade: unknown): string | null {
  if (typeof grade !== "string") return null;
  return GRADE_DESCRIPTIONS[grade.trim().toUpperCase() as LetterGrade] ?? null;
}

export function formatGrade(grade: unknown): string {
  if (grade === null || grade === undefined || grade === "") return "—";
  const letter = String(grade).trim().toUpperCase();
  const description = getGradeDescription(letter);
  return description ? `${letter} — ${description}` : String(grade);
}
