export const INCOMPLETE_MARKS_MESSAGE = "Complete all required marks before printing.";
export const REVALIDATION_MESSAGE = "Resolve changed or inconsistent grade calculations before printing.";

export function reportPrintBlockReason(reports, selectedStudentId = null) {
  const relevant = selectedStudentId
    ? reports.filter((report) => String(report.studentId) === String(selectedStudentId))
    : reports;
  if (relevant.some((report) =>
    (report.subjects || []).some((subject) => subject.needsRevalidation === true),
  )) return REVALIDATION_MESSAGE;
  if (relevant.some((report) =>
    (report.subjects || []).some((subject) =>
      subject.finalGrade === null ||
      subject.finalGrade === undefined ||
      subject.completenessState === "INCOMPLETE",
    ),
  )) return INCOMPLETE_MARKS_MESSAGE;
  return null;
}
