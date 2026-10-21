import assert from "node:assert/strict";
import test from "node:test";

const prismaModule = require("@prisma/client");
let db: any;
const OriginalClient = prismaModule.PrismaClient;
prismaModule.PrismaClient = class { constructor() { return db; } };
db = {};
const { saveReportComment } = require("./teacher.controller");
prismaModule.PrismaClient = OriginalClient;

function response() {
  return { code: 200, body: null as any, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; return this; } };
}

function fixture(teacherId = 7) {
  let row: any = null;
  db.$transaction = async (callback: any) => callback(db);
  db.$queryRaw = async () => [{
    teacherSubjectId: 2,
    teacherId,
    teacherSubjectActive: true,
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
