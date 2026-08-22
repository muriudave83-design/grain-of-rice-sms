export const PRINT_MODE = Object.freeze({
  SELECTED: "selected",
  ALL: "all",
});

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
