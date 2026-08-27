const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

export function suggestTermForLane(terms, classId, periodName, academicYear) {
  const matches = terms.filter((term) => term.classId === classId && normalize(term.name) === normalize(periodName) && normalize(term.academicYear) === normalize(academicYear));
  return matches.length === 1 ? String(matches[0].id) : "";
}
