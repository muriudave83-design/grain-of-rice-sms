const normalizeName = (value) => String(value ?? "").trim().replace(/\s+/g, " ");

export const getStudentDisplayName = (student) =>
  normalizeName(student.user?.name) || normalizeName(`${student.firstName ?? ""} ${student.lastName ?? ""}`);

export const filterAndSortReportStudents = (students, search, classId) => {
  const fragments = normalizeName(search).toLocaleLowerCase().split(" ").filter(Boolean);
  const selectedClassId = classId === "" ? null : Number(classId);

  return students
    .filter((student) => selectedClassId === null || student.classId === selectedClassId)
    .filter((student) => {
      const searchableName = normalizeName(
        `${getStudentDisplayName(student)} ${student.firstName ?? ""} ${student.lastName ?? ""}`,
      ).toLocaleLowerCase();
      return fragments.every((fragment) => searchableName.includes(fragment));
    })
    .sort((left, right) => {
      const byName = getStudentDisplayName(left).localeCompare(getStudentDisplayName(right), undefined, {
        sensitivity: "base",
      });
      return byName || left.id - right.id;
    });
};
