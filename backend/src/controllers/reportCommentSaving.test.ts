import assert from "node:assert/strict";
import test from "node:test";

const prismaModule = require("@prisma/client");
let db: any;
const OriginalClient = prismaModule.PrismaClient;
prismaModule.PrismaClient = class { constructor() { return db; } };
db = {};
const { saveReportComment } = require("./teacher.controller");
const { saveReportComment: saveLegacyReportComment } = require("./reports.controller");
prismaModule.PrismaClient = OriginalClient;

function response() {
  return { code: 200, body: null as any, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; return this; } };
}

function fixture(teacherId = 7, teacherSubjectActive = true) {
  let row: any = null;
  db.$transaction = async () => { throw new Error("comment endpoint must not open an interactive transaction"); };
  db.$queryRaw = async () => [{
    teacherSubjectId: 2,
    teacherId,
    teacherSubjectActive,
    classId: 8,
    termId: 3,
    termLocked: false,
    termActive: true,
    studentId: 1,
    studentClassId: 8,
    studentArchived: false,
  }];
  db.reportComment = {
    findUnique: async () => row ? { ...row } : null,
    create: async ({ data }: any) => {
      if (row) throw Object.assign(new Error("unique"), { code: "P2002" });
      row = { id: 11, ...data, updatedAt: new Date("2026-01-01T00:00:00.000Z") };
      return { ...row };
    },
    updateMany: async ({ where, data }: any) => {
      if (!row || row.id !== where.id || row.updatedAt.getTime() !== where.updatedAt.getTime()) return { count: 0 };
      row = { ...row, ...data };
      return { count: 1 };
    },
  };
  return { current: () => row };
}

test("comment endpoint requires expectedUpdatedAt", async () => {
  fixture();
  const res = response();
  await saveReportComment({ user: { id: 7 }, body: { studentId: 1, teacherSubjectId: 2, termId: 3, comment: "draft" } }, res);
  assert.equal(res.code, 428);
});

test("comment endpoint returns authoritative value and token on conflict", async () => {
  const state = fixture();
  const created = response();
  await saveReportComment({ user: { id: 7 }, body: { studentId: 1, teacherSubjectId: 2, termId: 3, comment: "saved", expectedUpdatedAt: null } }, created);
  const conflict = response();
  await saveReportComment({ user: { id: 7 }, body: { studentId: 1, teacherSubjectId: 2, termId: 3, comment: "stale", expectedUpdatedAt: "2025-01-01T00:00:00.000Z" } }, conflict);
  assert.equal(conflict.code, 409);
  assert.equal(conflict.body.current.comment, "saved");
  assert.equal(new Date(conflict.body.current.updatedAt).toISOString(), state.current().updatedAt.toISOString());
});

test("authorized conflict resolution overwrites using the authoritative token", async () => {
  const state = fixture();
  const created = response();
  await saveReportComment({ user: { id: 7 }, body: { studentId: 1, teacherSubjectId: 2, termId: 3, comment: "saved elsewhere", expectedUpdatedAt: null } }, created);

  const stale = response();
  await saveReportComment({ user: { id: 7 }, body: { studentId: 1, teacherSubjectId: 2, termId: 3, comment: "my intended comment", expectedUpdatedAt: "2025-01-01T00:00:00.000Z" } }, stale);
  const overwrite = response();
  await saveReportComment({ user: { id: 7 }, body: {
    studentId: 1,
    teacherSubjectId: 2,
    termId: 3,
    comment: "my intended comment",
    expectedUpdatedAt: stale.body.current.updatedAt,
  } }, overwrite);

  assert.equal(overwrite.code, 200);
  assert.equal(overwrite.body.comment, "my intended comment");
  assert.equal(state.current().comment, "my intended comment");
});

test("conflict resolution never bypasses teacher-subject ownership", async () => {
  fixture(99);
  const denied = response();
  await saveReportComment({ user: { id: 7 }, body: {
    studentId: 1,
    teacherSubjectId: 2,
    termId: 3,
    comment: "unauthorized overwrite",
    expectedUpdatedAt: null,
  } }, denied);
  assert.equal(denied.code, 403);
});

test("teacher cannot save after the TeacherSubject assignment is revoked", async () => {
  const state = fixture(7, false);
  const denied = response();
  await saveReportComment({ user: { id: 7 }, body: {
    studentId: 1,
    teacherSubjectId: 2,
    termId: 3,
    comment: "must not be written",
    expectedUpdatedAt: null,
  } }, denied);
  assert.equal(denied.code, 403);
  assert.equal(state.current(), null);
});

test("blank values require explicit clearing semantics", async () => {
  const state = fixture();
  const created = response();
  await saveReportComment({ user: { id: 7 }, body: { studentId: 1, teacherSubjectId: 2, termId: 3, comment: "keep this", expectedUpdatedAt: null } }, created);
  const accidental = response();
  await saveReportComment({ user: { id: 7 }, body: { studentId: 1, teacherSubjectId: 2, termId: 3, comment: "", expectedUpdatedAt: created.body.updatedAt } }, accidental);
  assert.equal(accidental.code, 422);
  assert.equal(state.current().comment, "keep this");
  const intentional = response();
  await saveReportComment({ user: { id: 7 }, body: { studentId: 1, teacherSubjectId: 2, termId: 3, comment: "", expectedUpdatedAt: created.body.updatedAt, allowEmpty: true } }, intentional);
  assert.equal(intentional.code, 200);
  assert.equal(state.current().comment, "");
});

test("pool acquisition failures are retryable and never reported as saved", async () => {
  fixture();
  db.$queryRaw = async () => { throw Object.assign(new Error("Timed out fetching a new connection from the connection pool"), { code: "P2024" }); };
  const res = response();
  await saveReportComment({ user: { id: 7 }, body: { studentId: 1, teacherSubjectId: 2, termId: 3, comment: "safe draft", expectedUpdatedAt: null } }, res);
  assert.equal(res.code, 503);
  assert.equal(res.body.retryable, true);
});

test("legacy report-comment route uses the same authorization and no-transaction save path", async () => {
  fixture(99);
  const denied = response();
  await saveLegacyReportComment({ user: { id: 7 }, body: {
    studentId: 1,
    teacherSubjectId: 2,
    termId: 3,
    comment: "unauthorized",
    expectedUpdatedAt: null,
  } }, denied);
  assert.equal(denied.code, 403);
});
