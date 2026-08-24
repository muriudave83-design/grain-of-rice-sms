type ReportCommentRecord = {
  studentId: number;
  teacherSubjectId: number;
  comment: string;
};

type AssignmentRecord = {
  id?: number;
  weight?: number | null;
  maxPoints?: number | null;
  scores: Array<{ studentId: number; score: number | null }>;
};

type TeacherSubjectRecord = {
  id: number;
  teacherId: number;
  isActive: boolean;
  assignments: AssignmentRecord[];
};

type ClassSubjectRecord = {
  subjectId: number;
  subject: { name: string; teacherSubjects: TeacherSubjectRecord[] };
};

type GradeRecord = { studentId: number; subjectId: number; total: number };

export function calculateCompleteAssignmentResult(
  studentId: number,
  assignments: AssignmentRecord[],
) {
  if (assignments.length === 0) return null;

  let weightedTotal = 0;
  let totalWeight = 0;
  for (const assignment of assignments) {
    const score = assignment.scores.find((entry) => entry.studentId === studentId)?.score;
    const maxPoints = assignment.maxPoints ?? 100;
    const weight = assignment.weight ?? 1;
    if (score === null || score === undefined || maxPoints <= 0) return null;
    weightedTotal += (Number(score) / maxPoints) * 100 * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedTotal / totalWeight : null;
}

export function selectReportingTeacherSubject(
  teacherSubjects: TeacherSubjectRecord[],
) {
  return [...teacherSubjects].sort((left, right) => {
    const leftHasInputs = left.assignments.length > 0 ? 1 : 0;
    const rightHasInputs = right.assignments.length > 0 ? 1 : 0;
    return rightHasInputs - leftHasInputs || Number(right.isActive) - Number(left.isActive) || right.id - left.id;
  })[0] ?? null;
}

export function assembleClassSubjectResults({
  studentId,
  requestingTeacherId,
  classSubjects,
  grades,
  comments,
}: {
  studentId: number;
  requestingTeacherId: number;
  classSubjects: ClassSubjectRecord[];
  grades: GradeRecord[];
  comments: Map<string, string>;
}) {
  return classSubjects.map((classSubject) => {
    const teacherSubject = selectReportingTeacherSubject(classSubject.subject.teacherSubjects);
    const published = grades.find(
      (grade) => grade.studentId === studentId && grade.subjectId === classSubject.subjectId,
    );
    const calculated = teacherSubject
      ? calculateCompleteAssignmentResult(studentId, teacherSubject.assignments)
      : null;
    const result = published ? published.total : calculated;

    return {
      subjectId: classSubject.subjectId,
      teacherSubjectId: teacherSubject?.id ?? null,
      subjectName: classSubject.subject.name,
      finalGrade: result === null ? null : Number(result.toFixed(1)),
      resultSource: published ? "published-grade" : result === null ? "incomplete" : "assignment-draft",
      canEditComment: Boolean(
        teacherSubject?.isActive && teacherSubject.teacherId === requestingTeacherId,
      ),
      comment: teacherSubject
        ? getSubjectReportComment(comments, studentId, teacherSubject.id)
        : "",
    };
  });
}

export function indexReportComments(comments: ReportCommentRecord[]) {
  return new Map(
    comments.map((comment) => [
      `${comment.studentId}:${comment.teacherSubjectId}`,
      comment.comment,
    ]),
  );
}

export function getSubjectReportComment(
  comments: Map<string, string>,
  studentId: number,
  teacherSubjectId: number,
) {
  return comments.get(`${studentId}:${teacherSubjectId}`) ?? "";
}
