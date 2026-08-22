type ReportCommentRecord = {
  studentId: number;
  teacherSubjectId: number;
  comment: string;
};

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
