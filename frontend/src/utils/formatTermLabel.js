export function formatTermLabel(term) {
  if (!term) return "";

  const start = term.startDate
    ? new Date(
        term.startDate
      ).toLocaleDateString()
    : "No Start";

  const end = term.endDate
    ? new Date(
        term.endDate
      ).toLocaleDateString()
    : "No End";

  return `${term.name} — ${start} to ${end}`;
}