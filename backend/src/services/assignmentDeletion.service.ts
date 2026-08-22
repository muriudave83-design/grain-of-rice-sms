import { Prisma } from "@prisma/client";

export const SCORE_DELETE_CONFIRMATION = "DELETE ASSIGNMENT";

export type AssignmentDeletionResult =
  | { status: "NOT_FOUND" }
  | { status: "TERM_MISMATCH" }
  | { status: "PUBLISHED"; scoreCount: number }
  | { status: "CONFIRMATION_REQUIRED"; scoreCount: number; title: string }
  | { status: "DELETED"; scoreCount: number; title: string };

export async function deleteOwnedAssignment(
  client: any,
  teacherId: number,
  assignmentId: number,
  confirmation?: unknown,
): Promise<AssignmentDeletionResult> {
  return client.$transaction(async (tx: any) => {
    const assignment = await tx.assignment.findFirst({
      where: { id: assignmentId, teacherSubject: { teacherId } },
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

    const publishedGrade = await tx.grade.findFirst({
      where: {
        subjectId: assignment.teacherSubject.subjectId,
        termId: assignment.termId,
        student: { classId: assignment.teacherSubject.classId },
      },
      select: { id: true },
    });
    const scoreCount = assignment._count.scores;
    if (publishedGrade) return { status: "PUBLISHED", scoreCount };
    if (scoreCount > 0 && confirmation !== SCORE_DELETE_CONFIRMATION) {
      return { status: "CONFIRMATION_REQUIRED", scoreCount, title: assignment.title };
    }

    await tx.score.deleteMany({ where: { assignmentId: assignment.id } });
    await tx.assignment.delete({ where: { id: assignment.id } });
    return { status: "DELETED", scoreCount, title: assignment.title };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
