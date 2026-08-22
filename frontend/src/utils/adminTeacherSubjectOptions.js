export function getAssignableClassSubjects(payload) {
  if (!Array.isArray(payload)) {
    throw new Error("Unexpected class-subject response");
  }

  return payload.filter(
    (entry) => entry?.subject?.id && !entry.subject.isArchived,
  );
}
