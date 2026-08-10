export const GRADE_DESCRIPTIONS = {
  A: "Exceedingly Expectations",
  B: "Meeting Expectations",
  C: "Approaching Expectations",
  D: "Below Expectations",
  F: "Below Expectations",
} as const;

export type LetterGrade = keyof typeof GRADE_DESCRIPTIONS;

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
