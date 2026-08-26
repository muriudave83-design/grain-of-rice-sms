import { Prisma } from "@prisma/client";

export const SCORE_DELETE_CONFIRMATION = "DELETE ASSIGNMENT";
export const PUBLISHED_DELETE_CONFIRMATION = "DELETE PUBLISHED ASSIGNMENT";

export type AssignmentDeletionResult =
  | { status: "NOT_FOUND" }
  | { status: "TERM_MISMATCH" }
  | { status: "PUBLISHED_CONFIRMATION_REQUIRED"; scoreCount: number; publishedGradeCount: number; title: string }
  | { status: "CONFIRMATION_REQUIRED"; scoreCount: number; title: string }
  | { status: "DELETED"; scoreCount: number; title: string; invalidatedGradeCount: number };

export async function deleteOwnedAssignment(
  client: any,
  teacherId: number,
  assignmentId: number,
  confirmation?: unknown,
): Promise<AssignmentDeletionResult> {
  return client.$transaction(async (tx: any) => {
    const assignment = await tx.assignment.findFirst({
      where: { id: assignmentId, teacherSubject: { teacherId, isActive: true } },
      select: {
        id: true,
        title: true,
        termId: true,
        teacherSubject: { select: { subjectId: true, classId: true } },
        term: { select: { classId: true } },
        _count: { select: { scores: true } },
      },
    });
    if (!assignment) return { status: "NOT_FOUND" };
    if (assignment.term.classId !== assignment.teacherSubject.classId) return { status: "TERM_MISMATCH" };

    const publishedGradeCount = await tx.grade.count({
      where: {
        subjectId: assignment.teacherSubject.subjectId,
        termId: assignment.termId,
        student: { classId: assignment.teacherSubject.classId },
      },
    });
    const scoreCount = assignment._count.scores;
    if (publishedGradeCount > 0 && confirmation !== PUBLISHED_DELETE_CONFIRMATION) {
      return { status: "PUBLISHED_CONFIRMATION_REQUIRED", scoreCount, publishedGradeCount, title: assignment.title };
    }
    if (publishedGradeCount === 0 && scoreCount > 0 && confirmation !== SCORE_DELETE_CONFIRMATION) {
      return { status: "CONFIRMATION_REQUIRED", scoreCount, title: assignment.title };
    }

    await tx.score.deleteMany({ where: { assignmentId: assignment.id } });
    await tx.assignment.delete({ where: { id: assignment.id } });
    if (publishedGradeCount > 0) {
      await tx.grade.deleteMany({
        where: {
          subjectId: assignment.teacherSubject.subjectId,
          termId: assignment.termId,
          student: { classId: assignment.teacherSubject.classId },
        },
      });
    }
    return { status: "DELETED", scoreCount, title: assignment.title, invalidatedGradeCount: publishedGradeCount };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
