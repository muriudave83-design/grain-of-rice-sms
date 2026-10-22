export function academicPeriodKey(term) {
  return term ? JSON.stringify([term.name, term.academicYear]) : "";
}

export function approvalAcademicPeriods(assignments) {
  return [...new Map(assignments.map((assignment) => [academicPeriodKey(assignment.term), assignment.term])).entries()]
    .map(([key, term]) => ({ key, ...term }));
}

export function filterApprovalAssignments(assignments, classId = "", subjectId = "", academicPeriod = "") {
  return assignments.filter((assignment) =>
    (!classId || String(assignment.teacherSubject.classId) === String(classId)) &&
    (!subjectId || String(assignment.teacherSubject.subjectId) === String(subjectId)) &&
    (!academicPeriod || academicPeriodKey(assignment.term) === academicPeriod)
  );
}

export function eligibleApprovalAssignments(assignments) {
  return assignments.filter((assignment) => assignment.gradeContributionStatus === "UNREVIEWED" && assignment.safeToInclude);
}
