import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import {
  compareAndSetReportComment,
  compareAndSetScore,
  lockCommentWriteScope,
  lockScoreWriteScope,
  SavePreconditionError,
  validateLockedCommentScope,
  validateLockedScoreScope,
} from "./optimisticSave.service";

const url = process.env.COMBINED_GROUP_TEST_DATABASE_URL;
const parsed = url ? new URL(url) : null;
const isolated = Boolean(
  parsed &&
  ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname) &&
  parsed.pathname.slice(1).includes("combined_group_test") &&
  !/render|prod/i.test(parsed.href),
);

test("real PostgreSQL optimistic saves and locked authorization races", { skip: !isolated }, async () => {
  const db = new PrismaClient({ datasourceUrl: url });
  const peer = new PrismaClient({ datasourceUrl: url });
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try {
    const klass = await db.class.create({ data: { name: `Concurrency ${suffix}` } });
    const subject = await db.subject.create({ data: { name: `Concurrency ${suffix}`, code: `C${suffix}` } });
    await db.classSubject.create({ data: { classId: klass.id, subjectId: subject.id } });
    const teacher = await db.user.create({ data: { name: "Concurrency teacher", email: `${suffix}@example.invalid`, password: "x", role: "TEACHER" } });
    const teacherSubject = await db.teacherSubject.create({ data: { teacherId: teacher.id, classId: klass.id, subjectId: subject.id } });
    const term = await db.term.create({ data: { name: "Concurrency", academicYear: suffix, startDate: new Date("2026-01-01T00:00:00Z"), endDate: new Date("2026-12-31T00:00:00Z"), classId: klass.id } });
    const student = await db.student.create({ data: { firstName: "Concurrent", lastName: "Student", admissionNo: `C-${suffix}`, classId: klass.id } });
    const assignment = await db.assignment.create({ data: { title: "Concurrency", teacherSubjectId: teacherSubject.id, termId: term.id, maxPoints: 100 } });

    const saveScore = (client: PrismaClient, score: number, expectedScore: number | null) => client.$transaction(async (tx) => {
      const scope = validateLockedScoreScope(await lockScoreWriteScope(tx, assignment.id, student.id), { teacherId: teacher.id, score });
      return compareAndSetScore(tx, { studentId: student.id, assignmentId: assignment.id, score, maxPoints: scope.maxPoints, expectedScore });
    });
    const saveComment = (client: PrismaClient, comment: string, expectedUpdatedAt: string | null) => client.$transaction(async (tx) => {
      validateLockedCommentScope(await lockCommentWriteScope(tx, teacherSubject.id, term.id, student.id), teacher.id);
      return compareAndSetReportComment(tx, { studentId: student.id, teacherSubjectId: teacherSubject.id, termId: term.id, comment, expectedUpdatedAt });
    });

    const creates = await Promise.allSettled([saveScore(db, 10, null), saveScore(peer, 20, null)]);
    assert.equal(creates.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(creates.filter((result) => result.status === "rejected" && result.reason instanceof SavePreconditionError && result.reason.status === 409).length, 1);
    const initialScore = (await db.score.findUniqueOrThrow({ where: { studentId_assignmentId: { studentId: student.id, assignmentId: assignment.id } } })).score;
    const updates = await Promise.allSettled([saveScore(db, 30, initialScore), saveScore(peer, 40, initialScore)]);
    assert.equal(updates.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(updates.filter((result) => result.status === "rejected" && result.reason.status === 409).length, 1);

    const commentCreates = await Promise.allSettled([saveComment(db, "one", null), saveComment(peer, "two", null)]);
    assert.equal(commentCreates.filter((result) => result.status === "fulfilled").length, 1);
    const firstComment = await db.reportComment.findUniqueOrThrow({ where: { studentId_teacherSubjectId_termId: { studentId: student.id, teacherSubjectId: teacherSubject.id, termId: term.id } } });
    const commentUpdates = await Promise.allSettled([
      saveComment(db, "three", firstComment.updatedAt.toISOString()),
      saveComment(peer, "four", firstComment.updatedAt.toISOString()),
    ]);
    assert.equal(commentUpdates.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(commentUpdates.filter((result) => result.status === "rejected" && result.reason.status === 409).length, 1);
    const afterConcurrent = await db.reportComment.findUniqueOrThrow({ where: { id: firstComment.id } });
    const afterRapid = await saveComment(db, "rapid", afterConcurrent.updatedAt.toISOString());
    assert.ok(afterRapid.updatedAt.getTime() > afterConcurrent.updatedAt.getTime());

    async function expectBlockedMutation(
      mutate: (tx: any) => Promise<unknown>,
      restore: () => Promise<unknown>,
      operation: () => Promise<unknown>,
    ) {
      let release!: () => void;
      let locked!: () => void;
      const lockedPromise = new Promise<void>((resolve) => { locked = resolve; });
      const releasePromise = new Promise<void>((resolve) => { release = resolve; });
      const mutation = db.$transaction(async (tx) => {
        await mutate(tx);
        locked();
        await releasePromise;
      });
      await lockedPromise;
      const attempted = operation();
      await new Promise((resolve) => setTimeout(resolve, 50));
      release();
      await mutation;
      await assert.rejects(attempted, (error: any) => error instanceof SavePreconditionError && [403, 409].includes(error.status));
      await restore();
    }

    const currentScore = async () => (await db.score.findUniqueOrThrow({ where: { studentId_assignmentId: { studentId: student.id, assignmentId: assignment.id } } })).score;
    await expectBlockedMutation(
      (tx) => tx.term.update({ where: { id: term.id }, data: { isLocked: true } }),
      () => db.term.update({ where: { id: term.id }, data: { isLocked: false } }),
      async () => saveScore(peer, 50, await currentScore()),
    );
    await expectBlockedMutation(
      (tx) => tx.teacherSubject.update({ where: { id: teacherSubject.id }, data: { isActive: false } }),
      () => db.teacherSubject.update({ where: { id: teacherSubject.id }, data: { isActive: true } }),
      async () => saveScore(peer, 51, await currentScore()),
    );
    const otherClass = await db.class.create({ data: { name: `Transferred ${suffix}` } });
    await expectBlockedMutation(
      (tx) => tx.student.update({ where: { id: student.id }, data: { classId: otherClass.id } }),
      () => db.student.update({ where: { id: student.id }, data: { classId: klass.id } }),
      async () => saveScore(peer, 52, await currentScore()),
    );
  } finally {
    await Promise.all([db.$disconnect(), peer.$disconnect()]);
  }
});
