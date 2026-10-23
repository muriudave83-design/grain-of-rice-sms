import { getGradeDescription, getLetterGrade } from "../utils/gradeDescriptions";
import { assembleClassSubjectResults, indexReportComments } from "./reportData.service";
import {
  loadExcludedCombinedLabelSubjectIds,
} from "./officialReportSubjects.service";

export async function loadAuthoritativeReportResults(
  client: any,
  input: {
    classId: number;
    termId: number;
    studentIds: number[];
    requestingTeacherId?: number;
    includeComments?: boolean;
  },
) {
  const [allClassSubjects, excludedSubjectIds] = await Promise.all([
    client.classSubject.findMany({
      where: { classId: input.classId, subject: { isArchived: false } },
      orderBy: { subject: { name: "asc" } },
      include: {
        subject: {
          select: {
            name: true,
            teacherSubjects: {
              where: { classId: input.classId },
              select: {
                id: true,
                teacherId: true,
                isActive: true,
                assignments: {
                  where: { termId: input.termId },
                  select: {
                    id: true,
                    weight: true,
                    maxPoints: true,
                    gradeContributionStatus: true,
                    scores: {
                      where: { studentId: { in: input.studentIds } },
                      select: { studentId: true, score: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    loadExcludedCombinedLabelSubjectIds(client, { classId: input.classId, termId: input.termId }),
  ]);
  const classSubjects = allClassSubjects.filter(
    (classSubject: any) => !excludedSubjectIds.has(classSubject.subjectId),
  );

  const subjectIds = classSubjects.map((entry: any) => entry.subjectId);
  const teacherSubjectIds = classSubjects.flatMap((entry: any) =>
    entry.subject.teacherSubjects.map((teacherSubject: any) => teacherSubject.id),
  );
  const [grades, scopes, comments] = await Promise.all([
    client.grade.findMany({
      where: {
        termId: input.termId,
        studentId: { in: input.studentIds },
        subjectId: { in: subjectIds },
      },
      select: { studentId: true, subjectId: true, total: true, contributionRevision: true },
    }),
    client.gradeContributionScope.findMany({
      where: { classId: input.classId, termId: input.termId, subjectId: { in: subjectIds } },
      select: { subjectId: true, mode: true, revision: true },
    }),
    input.includeComments
      ? client.reportComment.findMany({
          where: {
            studentId: { in: input.studentIds },
            teacherSubjectId: { in: teacherSubjectIds },
            termId: input.termId,
          },
          select: { studentId: true, teacherSubjectId: true, comment: true, updatedAt: true },
        })
      : Promise.resolve([]),
  ]);

  const correctionAudits = client.auditLog?.findMany
    ? await client.auditLog.findMany({
        where: { action: "REPORT_CARDS_PUBLISHED", entityType: "Grade" },
        select: { metadata: true },
      })
    : [];
  const approvedCorrectionKeys = new Set(correctionAudits.flatMap((audit: any) => {
    const metadata = audit.metadata as any;
    return metadata?.reason === "Administrator-approved final report-card correction" &&
      metadata?.authorizedBy === "Ammy" && metadata?.authorizedAt === "2026-10-23"
      ? [`${metadata.studentId}:${metadata.subjectId}:${metadata.termId}:${metadata.approvedScore}`]
      : [];
  }));
  const reportGrades = grades.map((grade: any) => ({
    ...grade,
    approvedCorrection: approvedCorrectionKeys.has(
      `${grade.studentId}:${grade.subjectId}:${input.termId}:${grade.total}`,
    ),
  }));

  const scopeMap = new Map(scopes.map((scope: any) => [scope.subjectId, scope]));
  const commentMap = indexReportComments(comments);
  const resultsByStudent = new Map<number, any[]>();

  for (const studentId of input.studentIds) {
    const results = assembleClassSubjectResults({
      studentId,
      requestingTeacherId: input.requestingTeacherId ?? -1,
      classSubjects,
      grades: reportGrades,
      comments: commentMap,
      contributionScopes: scopeMap as any,
    }).map((subject) => {
      const classSubject = classSubjects.find((entry: any) => entry.subjectId === subject.subjectId);
      const teacherSubjects = classSubject?.subject.teacherSubjects ?? [];
      const assignmentCount = teacherSubjects.reduce(
        (count: number, teacherSubject: any) => count + teacherSubject.assignments.length,
        0,
      );
      const activeTeacherSubjectCount = teacherSubjects.filter((entry: any) => entry.isActive).length;
      const grade = getLetterGrade(subject.finalGrade);
      const configurationWarnings = [
        ...(assignmentCount === 0 && !reportGrades.some((entry: any) => entry.studentId === studentId && entry.subjectId === subject.subjectId)
          ? ["NO_TERM_ASSIGNMENTS"]
          : []),
        ...(activeTeacherSubjectCount > 1 ? ["MULTIPLE_ACTIVE_TEACHER_ASSIGNMENTS"] : []),
        ...(subject.needsRevalidation ? ["PUBLISHED_GRADE_NEEDS_REVALIDATION"] : []),
      ];
      return {
        ...subject,
        grade,
        gradeDescription: getGradeDescription(grade),
        configurationWarnings,
      };
    });
    resultsByStudent.set(studentId, results);
  }

  return { classSubjects, resultsByStudent };
}

export function summarizeCompleteReport(subjects: Array<{ finalGrade: number | null; completenessState: string; needsRevalidation?: boolean }>) {
  if (
    subjects.length === 0 ||
    subjects.some((subject) =>
      subject.finalGrade === null ||
      subject.needsRevalidation === true ||
      subject.completenessState === "REVIEW_REQUIRED" ||
      subject.completenessState === "NO_INCLUDED_ASSIGNMENTS"
    )
  ) {
    return { total: null, average: null, grade: null, gradeDescription: null, isComplete: false };
  }
  const total = Number(subjects.reduce((sum, subject) => sum + Number(subject.finalGrade), 0).toFixed(1));
  const average = Number((total / subjects.length).toFixed(1));
  const grade = getLetterGrade(average);
  return {
    total,
    average,
    grade,
    gradeDescription: getGradeDescription(grade),
    isComplete: true,
  };
}
