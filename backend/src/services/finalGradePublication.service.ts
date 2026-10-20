import { Prisma } from "@prisma/client";
import { calculateIncludedAssignments } from "./gradeContribution.service";

export class FinalGradePublicationError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

const MAX_SERIALIZATION_ATTEMPTS = 3;

function isSerializationConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

export async function publishFinalGradesAtomically(
  client: any,
  input: { classId: number; termId: number; teacherId: number },
) {
  for (let attempt = 1; attempt <= MAX_SERIALIZATION_ATTEMPTS; attempt++) {
    try {
      return await client.$transaction(async (tx: any) => {
        const term = await tx.term.findFirst({
          where: { id: input.termId, classId: input.classId },
          select: { id: true },
        });
        if (!term) throw new FinalGradePublicationError(400, "Term does not belong to this class");

        const teacherSubjects = await tx.teacherSubject.findMany({
          where: {
            teacherId: input.teacherId,
            classId: input.classId,
            isActive: true,
            class: { isArchived: false },
          },
          include: {
            subject: { select: { id: true, name: true } },
            assignments: {
              where: { termId: input.termId },
              include: { scores: true },
            },
          },
        });
        if (!teacherSubjects.length) throw new FinalGradePublicationError(403, "Not assigned to this class");

        const students = await tx.student.findMany({
          where: { classId: input.classId, isArchived: false },
          select: { id: true, firstName: true, lastName: true },
        });
        if (!students.length) throw new FinalGradePublicationError(400, "No active students are assigned to this class");

        const subjectIds = [...new Set(teacherSubjects.map((item: any) => item.subjectId))] as number[];
        const scopes = await tx.gradeContributionScope.findMany({
          where: { classId: input.classId, termId: input.termId, subjectId: { in: subjectIds } },
        });
        const scopeBySubject = new Map<number, any>(scopes.map((scope: any) => [scope.subjectId, scope]));
        const missing: Array<{ studentId?: number; student?: string; subject: string; assignment?: string }> = [];
        const publications: Array<{ studentId: number; subjectId: number; total: number; revision: number | null }> = [];
        const assignmentIdsToLock = new Set<number>();

        for (const teacherSubject of teacherSubjects) {
          const scope = scopeBySubject.get(teacherSubject.subjectId);
          if (scope) {
            if (scope.mode !== "ACTIVE") {
              missing.push({ subject: teacherSubject.subject.name, assignment: "Assignment inclusion review must be activated" });
              continue;
            }

            const assignments = await tx.assignment.findMany({
              where: {
                termId: input.termId,
                teacherSubject: { classId: input.classId, subjectId: teacherSubject.subjectId },
              },
              include: {
                scores: true,
                teacherSubject: { select: { id: true, classId: true, subjectId: true } },
              },
            });
            for (const assignment of assignments) {
              if (assignment.teacherSubject.classId !== input.classId || assignment.teacherSubject.subjectId !== teacherSubject.subjectId) {
                throw new FinalGradePublicationError(409, "Assignment ownership changed; refresh and try again");
              }
            }
            for (const student of students) {
              const resolved = calculateIncludedAssignments(student.id, assignments);
              if (resolved.status !== "COMPLETE") {
                missing.push({
                  studentId: student.id,
                  student: `${student.firstName} ${student.lastName}`,
                  subject: teacherSubject.subject.name,
                  assignment: resolved.status === "REVIEW_REQUIRED"
                    ? `Review required: ${resolved.unreviewedAssignmentIds.join(", ")}`
                    : resolved.status === "INCOMPLETE"
                      ? `Missing scores: ${resolved.missingAssignmentIds.join(", ")}`
                      : "No included assignments",
                });
              } else {
                resolved.assignmentIds.forEach((id) => assignmentIdsToLock.add(id));
                publications.push({
                  studentId: student.id,
                  subjectId: teacherSubject.subjectId,
                  total: Number(resolved.value.toFixed(1)),
                  revision: scope.revision,
                });
              }
            }
            continue;
          }

          const assignments = teacherSubject.assignments;
          if (!assignments.length) {
            missing.push({ subject: teacherSubject.subject.name });
            continue;
          }
          if (assignments.some((assignment: any) => assignment.maxPoints <= 0)) {
            throw new FinalGradePublicationError(409, `Cannot publish ${teacherSubject.subject.name}: assignment max points must be greater than zero.`);
          }
          const totalWeight = assignments.reduce((sum: number, assignment: any) => sum + (assignment.weight ?? 1), 0);
          if (totalWeight <= 0) {
            throw new FinalGradePublicationError(409, `Cannot publish ${teacherSubject.subject.name}: total assignment weight must be greater than zero.`);
          }
          for (const student of students) {
            let weightedTotal = 0;
            for (const assignment of assignments) {
              const score = assignment.scores.find((entry: any) => entry.studentId === student.id)?.score;
              if (score === null || score === undefined) {
                missing.push({
                  studentId: student.id,
                  student: `${student.firstName} ${student.lastName}`,
                  subject: teacherSubject.subject.name,
                  assignment: assignment.title,
                });
                continue;
              }
              weightedTotal += (Number(score) / assignment.maxPoints) * 100 * (assignment.weight ?? 1);
            }
            if (!missing.some((entry) => entry.studentId === student.id && entry.subject === teacherSubject.subject.name)) {
              publications.push({
                studentId: student.id,
                subjectId: teacherSubject.subjectId,
                total: Number((weightedTotal / totalWeight).toFixed(1)),
                revision: null,
              });
            }
          }
          assignments.forEach((assignment: any) => assignmentIdsToLock.add(assignment.id));
        }

        if (missing.length) {
          throw new FinalGradePublicationError(
            409,
            "Final grades cannot be published until every active student has a score for every assignment.",
            { missing },
          );
        }

        const assignmentIds = [...assignmentIdsToLock];
        if (assignmentIds.length) {
          await tx.$queryRaw(Prisma.sql`
            SELECT "id" FROM "Assignment"
            WHERE "id" IN (${Prisma.join(assignmentIds)})
            FOR UPDATE
          `);
        }

        for (const publication of publications) {
          await tx.grade.upsert({
            where: {
              studentId_subjectId_termId: {
                studentId: publication.studentId,
                subjectId: publication.subjectId,
                termId: input.termId,
              },
            },
            update: {
              average: publication.total / 100,
              total: publication.total,
              contributionRevision: publication.revision,
            },
            create: {
              studentId: publication.studentId,
              subjectId: publication.subjectId,
              termId: input.termId,
              average: publication.total / 100,
              total: publication.total,
              contributionRevision: publication.revision,
            },
          });
        }
        await tx.assignment.updateMany({
          where: { id: { in: assignmentIds } },
          data: { isLocked: true },
        });
        return { publishedGrades: publications.length };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (isSerializationConflict(error) && attempt < MAX_SERIALIZATION_ATTEMPTS) continue;
      if (isSerializationConflict(error)) {
        throw new FinalGradePublicationError(409, "Publication conflicted with another change; refresh and try again");
      }
      throw error;
    }
  }
  throw new FinalGradePublicationError(409, "Publication conflicted with another change; refresh and try again");
}
