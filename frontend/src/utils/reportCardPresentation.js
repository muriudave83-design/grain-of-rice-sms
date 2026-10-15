export const PRINT_MODE = Object.freeze({
  SELECTED: "selected",
  ALL: "all",
});

export function formatReportPercentage(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;

  const percentage = Number(value);
  return Number.isFinite(percentage) ? `${Math.round(percentage)}%` : fallback;
}

export function formatReportGrade(letter, description, fallback = "—") {
  if (letter === null || letter === undefined || letter === "") return fallback;

  const normalizedLetter = String(letter).trim().toUpperCase();
  return description
    ? `${normalizedLetter} (${String(description).trim()})`
    : normalizedLetter;
}

export function reportsForMode(reports, selectedStudentId, mode) {
  if (mode === PRINT_MODE.ALL) return reports;
  if (!selectedStudentId) return [];
  return reports.filter(
    (report) => String(report.studentId) === String(selectedStudentId),
  );
}

export function displaySubjectComment(comment) {
  return typeof comment === "string" && comment.trim() ? comment : "—";
}
