import { Prisma } from "@prisma/client";

export class SavePreconditionError extends Error {
  constructor(public status: number, message: string, public current?: unknown) {
    super(message);
  }
}

export async function lockScoreWriteScope(client: any, assignmentId: number, studentId: number) {
  const assignments = await (client.$queryRaw(Prisma.sql`
    SELECT
      a.id AS "assignmentId",
      a."maxPoints" AS "maxPoints",
      a."isLocked" AS "assignmentLocked",
      t."isLocked" AS "termLocked",
      t."isActive" AS "termActive",
      ts."teacherId" AS "teacherId",
      ts."isActive" AS "teacherSubjectActive",
      ts."classId" AS "classId"
    FROM "Assignment" a
    JOIN "TeacherSubject" ts ON ts.id = a."teacherSubjectId"
    JOIN "Term" t ON t.id = a."termId"
    WHERE a.id = ${assignmentId}
    FOR UPDATE OF a, ts, t
  `) as Promise<Array<{
    assignmentId: number;
    maxPoints: number;
    assignmentLocked: boolean;
    termLocked: boolean;
    termActive: boolean;
    teacherId: number;
    teacherSubjectActive: boolean;
    classId: number;
  }>>);
  if (!assignments[0]) return [];
  const students = await client.$queryRaw(Prisma.sql`
    SELECT id AS "studentId", "classId" AS "studentClassId", "isArchived" AS "studentArchived"
    FROM "Student"
    WHERE id = ${studentId}
    FOR UPDATE
  `) as Array<{ studentId: number; studentClassId: number | null; studentArchived: boolean }>;
  return [{
    ...assignments[0],
    studentId: students[0]?.studentId ?? null,
    studentClassId: students[0]?.studentClassId ?? null,
    studentArchived: students[0]?.studentArchived ?? null,
  }];
}

export async function lockCommentWriteScope(client: any, teacherSubjectId: number, termId: number, studentId: number) {
  const subjects = await (client.$queryRaw(Prisma.sql`
    SELECT
      ts.id AS "teacherSubjectId",
      ts."teacherId" AS "teacherId",
      ts."isActive" AS "teacherSubjectActive",
      ts."classId" AS "classId",
      t.id AS "termId",
      t."isLocked" AS "termLocked",
      t."isActive" AS "termActive"
    FROM "TeacherSubject" ts
    JOIN "Term" t ON t.id = ${termId} AND t."classId" = ts."classId"
    WHERE ts.id = ${teacherSubjectId}
    FOR UPDATE OF ts, t
  `) as Promise<Array<{
    teacherSubjectId: number;
    teacherId: number;
    teacherSubjectActive: boolean;
    classId: number;
    termId: number | null;
    termLocked: boolean | null;
    termActive: boolean | null;
  }>>);
  if (!subjects[0]) return [];
  const students = await client.$queryRaw(Prisma.sql`
    SELECT id AS "studentId", "classId" AS "studentClassId", "isArchived" AS "studentArchived"
    FROM "Student"
    WHERE id = ${studentId}
    FOR UPDATE
  `) as Array<{ studentId: number; studentClassId: number | null; studentArchived: boolean }>;
  return [{
    ...subjects[0],
    studentId: students[0]?.studentId ?? null,
    studentClassId: students[0]?.studentClassId ?? null,
    studentArchived: students[0]?.studentArchived ?? null,
  }];
}

export async function loadCommentWriteScope(client: any, teacherSubjectId: number, termId: number, studentId: number) {
  return client.$queryRaw(Prisma.sql`
    SELECT
      ts.id AS "teacherSubjectId",
      ts."teacherId" AS "teacherId",
      ts."isActive" AS "teacherSubjectActive",
      ts."classId" AS "classId",
      t.id AS "termId",
      t."isLocked" AS "termLocked",
      t."isActive" AS "termActive",
      s.id AS "studentId",
      s."classId" AS "studentClassId",
      s."isArchived" AS "studentArchived"
    FROM "TeacherSubject" ts
    JOIN "Term" t ON t.id = ${termId} AND t."classId" = ts."classId"
    JOIN "Student" s ON s.id = ${studentId}
    WHERE ts.id = ${teacherSubjectId}
  `) as Promise<Array<{
    teacherSubjectId: number;
    teacherId: number;
    teacherSubjectActive: boolean;
    classId: number;
    termId: number;
    termLocked: boolean;
    termActive: boolean;
    studentId: number;
    studentClassId: number | null;
    studentArchived: boolean;
  }>>;
}

export function validateLockedScoreScope(
  rows: Awaited<ReturnType<typeof lockScoreWriteScope>>,
  input: { teacherId?: number; score: number },
) {
  const row = rows[0];
  if (!row) throw new SavePreconditionError(404, "Assignment not found");
  if (input.teacherId !== undefined && row.teacherId !== input.teacherId) {
    throw new SavePreconditionError(403, "Not authorized for this assignment");
  }
  if (input.teacherId !== undefined && !row.teacherSubjectActive) throw new SavePreconditionError(403, "This teacher assignment is inactive");
  if (row.assignmentLocked || row.termLocked || !row.termActive) {
    throw new SavePreconditionError(409, "Assignment or term is locked or inactive");
  }
  if (!row.studentId || row.studentArchived || row.studentClassId !== row.classId) {
    throw new SavePreconditionError(409, "Student is not active in this assignment's class");
  }
  if (input.score > row.maxPoints) throw new SavePreconditionError(400, "Score exceeds assignment maximum");
  return row;
}

export function validateLockedCommentScope(
  rows: Awaited<ReturnType<typeof lockCommentWriteScope>> | Awaited<ReturnType<typeof loadCommentWriteScope>>,
  teacherId: number,
) {
  const row = rows[0];
  if (!row || row.teacherId !== teacherId || !row.teacherSubjectActive) {
    throw new SavePreconditionError(403, "Not authorized for this subject");
  }
  if (!row.termId || row.termLocked || !row.termActive) {
    throw new SavePreconditionError(409, "Term is locked, inactive, or does not belong to this class");
  }
  if (!row.studentId || row.studentArchived || row.studentClassId !== row.classId) {
    throw new SavePreconditionError(409, "Student is not active in this subject's class");
  }
  return row;
}

export async function saveAuthorizedReportComment(client: any, input: {
  teacherId: number;
  studentId: number;
  teacherSubjectId: number;
  termId: number;
  comment: string;
  expectedUpdatedAt: string | null;
  allowEmpty?: boolean;
}) {
  const comment = String(input.comment ?? "");
  if (!comment.trim() && !input.allowEmpty) {
    throw new SavePreconditionError(422, "Clearing a saved comment requires explicit confirmation");
  }
  validateLockedCommentScope(
    await loadCommentWriteScope(client, input.teacherSubjectId, input.termId, input.studentId),
    input.teacherId,
  );
  return compareAndSetReportComment(client, { ...input, comment });
}

export function isTransientCommentSaveError(error: any) {
  return error?.code === "P2024" || error?.code === "P2028" || /Unable to start a transaction|connection pool|timed out/i.test(String(error?.message ?? ""));
}

export function hasRequiredPrecondition(input: object, key: string) {
  return Object.prototype.hasOwnProperty.call(input, key);
}

function isUniqueConflict(error: any) {
  return error?.code === "P2002";
}

export async function compareAndSetScore(
  client: any,
  input: {
    studentId: number;
    assignmentId: number;
    score: number;
    maxPoints: number;
    expectedScore: number | null;
  },
) {
  const key = {
    studentId: input.studentId,
    assignmentId: input.assignmentId,
  };
  const current = await client.score.findUnique({
    where: { studentId_assignmentId: key },
  });

  if (!current) {
    if (input.expectedScore !== null) {
      throw new SavePreconditionError(409, "Score changed or was removed; reload before retrying", null);
    }
    try {
      return await client.score.create({
        data: {
          ...key,
          score: input.score,
          maxPoints: input.maxPoints,
        },
      });
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const authoritative = await client.score.findUnique({
        where: { studentId_assignmentId: key },
      });
      throw new SavePreconditionError(409, "Score was created by another request", authoritative);
    }
  }

  if (input.expectedScore === null) {
    throw new SavePreconditionError(409, "Score already exists; reload before retrying", current);
  }

  const changed = await client.score.updateMany({
    where: { ...key, score: input.expectedScore },
    data: { score: input.score, maxPoints: input.maxPoints },
  });
  if (changed.count !== 1) {
    const authoritative = await client.score.findUnique({
      where: { studentId_assignmentId: key },
    });
    throw new SavePreconditionError(409, "Score changed in another session", authoritative);
  }
  return client.score.findUnique({ where: { studentId_assignmentId: key } });
}

export async function compareAndSetReportComment(
  client: any,
  input: {
    studentId: number;
    teacherSubjectId: number;
    termId: number;
    comment: string;
    expectedUpdatedAt: string | null;
  },
) {
  const key = {
    studentId: input.studentId,
    teacherSubjectId: input.teacherSubjectId,
    termId: input.termId,
  };
  const current = await client.reportComment.findUnique({
    where: { studentId_teacherSubjectId_termId: key },
  });

  if (!current) {
    if (input.expectedUpdatedAt !== null) {
      throw new SavePreconditionError(409, "Comment changed or was removed; reload before retrying", null);
    }
    try {
      return await client.reportComment.create({ data: { ...key, comment: input.comment } });
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const authoritative = await client.reportComment.findUnique({
        where: { studentId_teacherSubjectId_termId: key },
      });
      throw new SavePreconditionError(409, "Comment was created by another request", authoritative);
    }
  }

  if (input.expectedUpdatedAt === null) {
    // A response may have been lost after a successful create. Repeating the
    // same intended value is already satisfied and must not become a false
    // conflict.
    if (current.comment === input.comment) return current;
    throw new SavePreconditionError(409, "Comment already exists; reload before retrying", current);
  }
  const expected = new Date(input.expectedUpdatedAt);
  if (Number.isNaN(expected.getTime())) {
    throw new SavePreconditionError(428, "A valid expectedUpdatedAt precondition is required");
  }

  // Prisma/PostgreSQL timestamps are millisecond-compatible here. Explicitly
  // advance by at least 1ms so two rapid writes cannot reuse the same token.
  const nextUpdatedAt = new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1));
  const changed = await client.reportComment.updateMany({
    where: { id: current.id, updatedAt: expected },
    data: { comment: input.comment, updatedAt: nextUpdatedAt },
  });
  if (changed.count !== 1) {
    const authoritative = await client.reportComment.findUnique({
      where: { studentId_teacherSubjectId_termId: key },
    });
    if (authoritative?.comment === input.comment) return authoritative;
    throw new SavePreconditionError(409, "Comment changed in another session", authoritative);
  }
  return client.reportComment.findUnique({ where: { studentId_teacherSubjectId_termId: key } });
}
