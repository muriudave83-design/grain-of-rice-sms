export const ASSIGNMENT_REVIEW_MESSAGE = "An administrator must review assignment inclusion before printing.";
export const INCOMPLETE_MARKS_MESSAGE = "Complete all required marks before printing.";

export function reportPrintBlockReason(reports, selectedStudentId = null) {
  const relevant = selectedStudentId
    ? reports.filter((report) => String(report.studentId) === String(selectedStudentId))
    : reports;
  if (relevant.some((report) =>
    (report.subjects || []).some((subject) => subject.completenessState === "REVIEW_REQUIRED"),
  )) return ASSIGNMENT_REVIEW_MESSAGE;
  if (relevant.some((report) =>
    (report.subjects || []).some((subject) => subject.completenessState === "INCOMPLETE"),
  )) return INCOMPLETE_MARKS_MESSAGE;
  return null;
}
