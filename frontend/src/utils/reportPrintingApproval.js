export function filterApprovalAssignments(assignments, classId = "", subjectId = "", termId = "") {
  return assignments.filter((assignment) =>
    (!classId || String(assignment.teacherSubject.classId) === String(classId)) &&
    (!subjectId || String(assignment.teacherSubject.subjectId) === String(subjectId)) &&
    (!termId || String(assignment.termId) === String(termId))
  );
}

export function eligibleApprovalAssignments(assignments) {
  return assignments.filter((assignment) => assignment.gradeContributionStatus === "UNREVIEWED" && assignment.safeToInclude);
}
