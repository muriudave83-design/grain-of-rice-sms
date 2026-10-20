type ReportCommentRecord = {
  studentId: number;
  teacherSubjectId: number;
  comment: string;
  updatedAt: Date;
};

import { resolveExplicitSubjectGrade } from "./gradeContribution.service";

type AssignmentRecord = {
  id?: number;
  weight?: number | null;
  maxPoints?: number | null;
  gradeContributionStatus?: "UNREVIEWED" | "INCLUDED" | "EXCLUDED";
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

type GradeRecord = { studentId: number; subjectId: number; total: number; contributionRevision?: number | null };

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
  contributionScopes = new Map(),
}: {
  studentId: number;
  requestingTeacherId: number;
  classSubjects: ClassSubjectRecord[];
  grades: GradeRecord[];
  comments: Map<string, { comment: string; updatedAt: Date }>;
  contributionScopes?: Map<number, { mode: "REVIEWING" | "ACTIVE"; revision: number }>;
}) {
  return classSubjects.map((classSubject) => {
    const teacherSubject = selectReportingTeacherSubject(classSubject.subject.teacherSubjects);
    const commentTeacherSubject = classSubject.subject.teacherSubjects.find(
      (record) => record.isActive && record.teacherId === requestingTeacherId,
    ) ?? teacherSubject;
    const published = grades.find(
      (grade) => grade.studentId === studentId && grade.subjectId === classSubject.subjectId,
    );
    const legacyCalculated = teacherSubject
      ? calculateCompleteAssignmentResult(studentId, teacherSubject.assignments)
      : null;
    const explicit = resolveExplicitSubjectGrade({
      studentId,
      assignments: classSubject.subject.teacherSubjects
        .flatMap((record) => record.assignments)
        .filter((assignment): assignment is AssignmentRecord & { id: number } => assignment.id !== undefined),
      scope: contributionScopes.get(classSubject.subjectId) ?? null,
      published,
    });
    const result = explicit && (explicit.status === "PUBLISHED" || explicit.status === "COMPLETE")
      ? explicit.value
      : explicit ? null : published ? published.total : legacyCalculated;
    const completenessState = explicit?.status ?? (result === null ? "INCOMPLETE" : published ? "PUBLISHED" : "COMPLETE");

    return {
      subjectId: classSubject.subjectId,
      teacherSubjectId: commentTeacherSubject?.id ?? null,
      subjectName: classSubject.subject.name,
      finalGrade: result === null ? null : Number(result.toFixed(1)),
      resultSource: published ? "published-grade" : result === null ? "incomplete" : "assignment-draft",
      completenessState,
      needsRevalidation: explicit?.status === "PUBLISHED" ? explicit.needsRevalidation : false,
      canEditComment: Boolean(
        commentTeacherSubject?.isActive && commentTeacherSubject.teacherId === requestingTeacherId,
      ),
      comment: commentTeacherSubject
        ? getSubjectReportComment(comments, studentId, commentTeacherSubject.id)?.comment ?? ""
        : "",
      commentUpdatedAt: commentTeacherSubject
        ? getSubjectReportComment(comments, studentId, commentTeacherSubject.id)?.updatedAt ?? null
        : null,
    };
  });
}

export function indexReportComments(comments: ReportCommentRecord[]) {
  return new Map(
    comments.map((comment) => [
      `${comment.studentId}:${comment.teacherSubjectId}`,
      { comment: comment.comment, updatedAt: comment.updatedAt },
    ]),
  );
}

export function getSubjectReportComment(
  comments: Map<string, { comment: string; updatedAt: Date }>,
  studentId: number,
  teacherSubjectId: number,
) {
  return comments.get(`${studentId}:${teacherSubjectId}`) ?? null;
}
