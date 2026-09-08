export function flattenCombinedRoster(sections = []) {
  return sections.flatMap((section) =>
    (section.students || []).map((student) => ({
      ...student,
      classId: student.classId ?? section.class?.id ?? null,
      laneId: section.laneId,
      class: section.class,
      subject: section.subject,
      term: section.term,
    })),
  );
}

export function visibleCombinedAssignments(assignments = []) {
  return assignments;
}
