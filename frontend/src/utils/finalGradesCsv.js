const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export const filenamePart = (value) =>
  String(value || "unknown")
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "");

export function buildFinalGradesCsv({ data, className, term }) {
  const headers = [
    "Class",
    "Term",
    "Academic Year",
    "Subject",
    "Student Name",
    "Admission Number",
    "Average (%)",
    "Grade",
    "Grade Description",
    "Remarks",
  ];
  const rows = data.map((student) => [
    className,
    term?.name || "",
    term?.academicYear || "",
    (student.subjects || []).join(", "),
    student.name,
    student.admissionNo || "",
    student.average ?? "",
    student.isComplete === false ? "Incomplete" : student.letter,
    student.gradeDescription || "",
    student.remarks || "",
  ]);

  return [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");
}
