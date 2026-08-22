export function getAssignableClassSubjects(payload) {
  if (!Array.isArray(payload)) {
    throw new Error("Unexpected class-subject response");
  }

  return payload.filter(
    (entry) => entry?.subject?.id && !entry.subject.isArchived,
  );
}

export function getSearchableActiveTeachers(payload, query = "") {
  if (!Array.isArray(payload)) throw new Error("Unexpected teacher response");
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return payload.filter((teacher) => {
    if (teacher?.role !== "TEACHER" || teacher.isArchived || teacher.isActive === false) return false;
    if (!normalizedQuery) return true;
    return [teacher.name, teacher.email].some((value) =>
      String(value || "").toLocaleLowerCase().includes(normalizedQuery),
    );
  });
}
