export function formatTermLabel(term) {
  if (!term) return "";

  const start = term.startDate
    ? new Date(term.startDate).toLocaleDateString()
    : "No Start";

  const end = term.endDate
    ? new Date(term.endDate).toLocaleDateString()
    : "No End";

  const className = term.class?.name || `Class ${term.classId}`;

  return `${className} | ${term.name} | ${term.academicYear} | ${start} to ${end}`;
}
