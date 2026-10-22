import assert from "node:assert/strict";
import test from "node:test";
import {
  compareAndSetReportComment,
  compareAndSetScore,
  SavePreconditionError,
} from "./optimisticSave.service";

function scoreFixture(initial: any = null) {
  let row = initial ? { id: 41, studentId: 1, assignmentId: 10, maxPoints: 100, ...initial } : null;
  const score = {
    findUnique: async () => row ? { ...row } : null,
    create: async ({ data }: any) => {
      if (row) throw Object.assign(new Error("unique"), { code: "P2002" });
      row = { id: 41, ...data };
      return { ...row };
    },
    updateMany: async ({ where, data }: any) => {
      if (!row || row.score !== where.score) return { count: 0 };
      row = { ...row, ...data };
      return { count: 1 };
    },
  };
  return { client: { score }, current: () => row };
}

test("score create, upward/downward correction, zero, and ID preservation", async () => {
  const fixture = scoreFixture();
  const created = await compareAndSetScore(fixture.client, { studentId: 1, assignmentId: 10, score: 20, maxPoints: 100, expectedScore: null });
  assert.equal(created.id, 41);
  for (const next of [85, 5, 0]) {
    const prior = fixture.current()!.score;
    const saved = await compareAndSetScore(fixture.client, { studentId: 1, assignmentId: 10, score: next, maxPoints: 100, expectedScore: prior });
    assert.equal(saved.id, 41);
    assert.equal(saved.score, next);
  }
});

test("late stale score cannot overwrite a newer persisted correction", async () => {
  const fixture = scoreFixture({ score: 20 });
  await compareAndSetScore(fixture.client, { studentId: 1, assignmentId: 10, score: 40, maxPoints: 100, expectedScore: 20 });
  await assert.rejects(
    () => compareAndSetScore(fixture.client, { studentId: 1, assignmentId: 10, score: 30, maxPoints: 100, expectedScore: 20 }),
    (error: any) => error instanceof SavePreconditionError && error.status === 409 && (error.current as any).score === 40,
  );
  assert.equal(fixture.current()!.score, 40);
});

function commentFixture(initial: any = null) {
  let row = initial ? { id: 7, studentId: 1, teacherSubjectId: 2, termId: 3, ...initial } : null;
  const reportComment = {
    findUnique: async () => row ? { ...row } : null,
    create: async ({ data }: any) => {
      if (row) throw Object.assign(new Error("unique"), { code: "P2002" });
      row = { id: 7, ...data, updatedAt: new Date("2026-01-01T00:00:00.000Z") };
      return { ...row };
    },
    updateMany: async ({ where, data }: any) => {
      if (!row || row.id !== where.id || row.updatedAt.getTime() !== where.updatedAt.getTime()) return { count: 0 };
      row = { ...row, ...data };
      return { count: 1 };
    },
  };
  return { client: { reportComment }, current: () => row };
}

test("comment create, edit, empty value, and monotonically advancing token", async () => {
  const fixture = commentFixture();
  const created = await compareAndSetReportComment(fixture.client, { studentId: 1, teacherSubjectId: 2, termId: 3, comment: "Draft", expectedUpdatedAt: null });
  const edited = await compareAndSetReportComment(fixture.client, { studentId: 1, teacherSubjectId: 2, termId: 3, comment: "Final", expectedUpdatedAt: created.updatedAt.toISOString() });
  assert.ok(edited.updatedAt.getTime() > created.updatedAt.getTime());
  const emptied = await compareAndSetReportComment(fixture.client, { studentId: 1, teacherSubjectId: 2, termId: 3, comment: "", expectedUpdatedAt: edited.updatedAt.toISOString() });
  assert.equal(emptied.comment, "");
  assert.ok(emptied.updatedAt.getTime() > edited.updatedAt.getTime());
});

test("stale comment cannot erase a newer comment", async () => {
  const timestamp = new Date("2026-01-01T00:00:00.000Z");
  const fixture = commentFixture({ comment: "Old", updatedAt: timestamp });
  await compareAndSetReportComment(fixture.client, { studentId: 1, teacherSubjectId: 2, termId: 3, comment: "New", expectedUpdatedAt: timestamp.toISOString() });
  await assert.rejects(
    () => compareAndSetReportComment(fixture.client, { studentId: 1, teacherSubjectId: 2, termId: 3, comment: "", expectedUpdatedAt: timestamp.toISOString() }),
    (error: any) => error instanceof SavePreconditionError && error.status === 409 && (error.current as any).comment === "New",
  );
});

test("a repeated request after a lost response is idempotently acknowledged", async () => {
  const fixture = commentFixture();
  const created = await compareAndSetReportComment(fixture.client, {
    studentId: 1, teacherSubjectId: 2, termId: 3, comment: "Safe text", expectedUpdatedAt: null,
  });
  const retriedCreate = await compareAndSetReportComment(fixture.client, {
    studentId: 1, teacherSubjectId: 2, termId: 3, comment: "Safe text", expectedUpdatedAt: null,
  });
  const retriedUpdate = await compareAndSetReportComment(fixture.client, {
    studentId: 1, teacherSubjectId: 2, termId: 3, comment: "Safe text", expectedUpdatedAt: "2025-01-01T00:00:00.000Z",
  });
  assert.equal(retriedCreate.updatedAt.toISOString(), created.updatedAt.toISOString());
  assert.equal(retriedUpdate.comment, "Safe text");
});
