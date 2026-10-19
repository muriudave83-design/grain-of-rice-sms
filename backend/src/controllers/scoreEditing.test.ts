import assert from "node:assert/strict";
import test from "node:test";

// Replace the constructor before loading controllers: no real Prisma client or DB connection.
const prismaModule = require("@prisma/client");
let db: any;
const OriginalClient = prismaModule.PrismaClient;
prismaModule.PrismaClient = class { constructor() { return db; } };
db = {};
const { upsertScore, bulkUpdateScores } = require("./teacher.controller");
prismaModule.PrismaClient = OriginalClient;
const { saveCombinedScore } = require("../services/combinedTeachingGroup.service");

function fixture() {
  const rows: any[] = [];
  const assignment = { id: 10, maxPoints: 50, isLocked: false, term: { isLocked: false }, teacherSubject: { teacherId: 7, classId: 8, isActive: true } };
  const student = { id: 1, classId: 8, isArchived: false };
  Object.assign(db, {
    assignment: {
      findUnique: async () => assignment,
      findMany: async ({ where }: any) => where.teacherSubject.teacherId === 7 ? [assignment] : [],
    },
    combinedAssignmentChild: { findFirst: async () => null },
    student: { findFirst: async () => ({ id: student.id }), findMany: async () => [student] },
    score: { upsert: async ({ where, create, update }: any) => {
      const key = where.studentId_assignmentId;
      let row = rows.find((r) => r.studentId === key.studentId && r.assignmentId === key.assignmentId);
      if (row) Object.assign(row, update);
      else { row = { id: rows.length + 100, ...create }; rows.push(row); }
      return { ...row };
    },
    findUnique: async ({ where }: any) => rows.find((r) => r.studentId === where.studentId_assignmentId.studentId && r.assignmentId === where.studentId_assignmentId.assignmentId) || null,
    create: async ({ data }: any) => { const row = { id: rows.length + 100, ...data }; rows.push(row); return { ...row }; },
    updateMany: async ({ where, data }: any) => { const row = rows.find((r) => r.studentId === where.studentId && r.assignmentId === where.assignmentId && r.score === where.score); if (!row) return { count: 0 }; Object.assign(row, data); return { count: 1 }; },
    },
    $queryRaw: async () => [{
      assignmentId: assignment.id,
      maxPoints: assignment.maxPoints,
      assignmentLocked: assignment.isLocked,
      termLocked: assignment.term.isLocked,
      termActive: true,
      teacherId: assignment.teacherSubject.teacherId,
      teacherSubjectActive: assignment.teacherSubject.isActive,
      classId: assignment.teacherSubject.classId,
      studentId: student.id,
      studentClassId: student.classId,
      studentArchived: student.isArchived,
    }],
    $transaction: async (operation: any) => typeof operation === "function" ? operation(db) : Promise.all(operation),
  });
  return { rows, assignment, student };
}

async function save(score: number, teacherId = 7, bulk = false) {
  const response: any = { code: 200, body: null, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; return this; } };
  const existing = db.score ? await db.score.findUnique({ where: { studentId_assignmentId: { studentId: 1, assignmentId: 10 } } }) : null;
  const update = { studentId: 1, assignmentId: 10, score, expectedScore: existing?.score ?? null };
  await (bulk ? bulkUpdateScores : upsertScore)({ user: { id: teacherId }, body: bulk ? { updates: [update] } : update }, response);
  return response;
}

test("normal score creation and upward/downward/zero edits preserve one Score ID", async () => {
  const { rows } = fixture();
  for (const score of [20, 45, 15, 0]) {
    const result = await save(score);
    assert.equal(result.code, 200);
    assert.equal(result.body.id, 100);
    assert.equal(result.body.score, score);
    assert.equal(rows.length, 1);
  }
});

test("single and bulk endpoints require explicit concurrency preconditions", async () => {
  fixture();
  const response: any = { code: 200, body: null, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; return this; } };
  await upsertScore({ user: { id: 7 }, body: { studentId: 1, assignmentId: 10, score: 20 } }, response);
  assert.equal(response.code, 428);
  response.code = 200;
  await bulkUpdateScores({ user: { id: 7 }, body: { updates: [{ studentId: 1, assignmentId: 10, score: 20 }] } }, response);
  assert.equal(response.code, 428);
});

test("single endpoint returns authoritative score on HTTP 409", async () => {
  const { rows } = fixture();
  await save(20);
  const response: any = { code: 200, body: null, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; return this; } };
  await upsertScore({ user: { id: 7 }, body: { studentId: 1, assignmentId: 10, score: 40, expectedScore: 10 } }, response);
  assert.equal(response.code, 409);
  assert.equal(response.body.current.score, 20);
  assert.equal(rows[0].score, 20);
});

test("normal score validation and ownership reject changes without touching the row", async () => {
  const { rows, assignment } = fixture();
  await save(20);
  for (const score of [-1, 51, NaN, Infinity]) assert.equal((await save(score)).code, 400);
  assert.equal((await save(30, 99)).code, 403);
  assignment.teacherSubject.isActive = false;
  assert.equal((await save(30)).code, 403);
  assert.deepEqual(rows, [{ id: 100, studentId: 1, assignmentId: 10, score: 20, maxPoints: 50 }]);
});

for (const lock of ["assignment", "term"]) {
  test(`${lock} lock blocks single and bulk edits and preserves existing score`, async () => {
    const { rows, assignment } = fixture();
    await save(20);
    (lock === "term" ? assignment.term : assignment).isLocked = true;
    assert.equal((await save(40)).code, 409);
    const bulk = await save(40, 7, true);
    assert.equal(bulk.body.updated, 0);
    assert.equal(bulk.body.skippedLocked, 1);
    assert.equal(rows[0].score, 20);
    assert.equal(rows[0].id, 100);
  });
}

test("unlocked bulk edits update the same Score and retain maxPoints/ownership checks", async () => {
  const { rows } = fixture();
  await save(20);
  assert.equal((await save(45, 7, true)).body.updated, 1);
  assert.equal((await save(51, 7, true)).body.invalid, 1);
  assert.equal((await save(30, 99, true)).body.invalid, 1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 100);
  assert.equal(rows[0].score, 45);
});

test("bulk edit reports a stale expected score as a conflict without overwriting", async () => {
  const { rows } = fixture();
  await save(20);
  const response: any = { code: 200, body: null, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; return this; } };
  await bulkUpdateScores({
    user: { id: 7 },
    body: { updates: [{ studentId: 1, assignmentId: 10, score: 40, expectedScore: 10 }] },
  }, response);
  assert.equal(response.code, 200);
  assert.equal(response.body.updated, 0);
  assert.equal(response.body.conflicted, 1);
  assert.equal(rows[0].score, 20);
  assert.equal(rows[0].id, 100);
});

for (const change of ["lock", "ownership", "student-class"] as const) {
  test(`bulk revalidates ${change} after its preview snapshot and before mutation`, async () => {
    const { rows, assignment, student } = fixture();
    await save(20);
    const originalTransaction = db.$transaction;
    let changed = false;
    db.$transaction = async (operation: any) => {
      if (!changed) {
        changed = true;
        if (change === "lock") assignment.isLocked = true;
        if (change === "ownership") assignment.teacherSubject.teacherId = 99;
        if (change === "student-class") student.classId = 999;
      }
      return originalTransaction(operation);
    };
    const response = await save(40, 7, true);
    assert.equal(response.body.updated, 0);
    assert.equal(rows[0].score, 20);
    assert.equal(rows[0].id, 100);
  });
}

function combinedFixture() {
  const { rows } = fixture();
  const classes = [8, 9].map((classId) => ({
    id: classId, isActive: true, endedAt: null,
    classSubject: { classId, class: { isArchived: false }, subject: { isArchived: false } },
    members: [{ isActive: true, isAssignmentOwner: true, teacherSubject: { teacherId: 7, isActive: true } }],
    termMappings: [{ teachingGroupPeriodId: 3, term: { id: classId + 100, isLocked: false, isActive: true } }],
  }));
  const children = classes.map((lane) => ({ assignmentId: lane.id + 20, assignment: { id: lane.id + 20, maxPoints: 50, isLocked: false }, combinedAssignment: { teachingGroupPeriodId: 3 } }));
  const client = {
    ...db,
    $transaction: async (callback: any) => callback(client),
    $queryRaw: async (query: any) => {
      if (query.sql.includes('FROM "Student"')) {
        const studentId = query.values[0];
        return [{ studentId, studentClassId: studentId, studentArchived: false }];
      }
      const assignmentId = query.values[0];
      const child = children.find((entry) => entry.assignmentId === assignmentId);
      if (!child) return [];
      return [{
        assignmentId,
        maxPoints: child.assignment.maxPoints,
        assignmentLocked: child.assignment.isLocked,
        termLocked: false,
        termActive: true,
        teacherId: 7,
        teacherSubjectActive: true,
        classId: assignmentId - 20,
      }];
    },
    teachingGroup: { findFirst: async () => ({ id: 2, isActive: true, endedAt: null, classes }) },
    student: { findFirst: async ({ where }: any) => ({ id: where.id, classId: where.id }) },
    combinedAssignmentChild: { findFirst: async ({ where }: any) => children.find((child) => child.assignmentId === where.teachingGroupClassId + 20) },
  };
  const write = async (studentId: number, score: number, teacherId = 7) => {
    const assignmentId = studentId + 20;
    const existing = rows.find((row) => row.studentId === studentId && row.assignmentId === assignmentId);
    return saveCombinedScore(client, 2, teacherId, { studentId, combinedAssignmentId: 4, score, expectedScore: existing?.score ?? null });
  };
  return { rows, classes, children, client, write };
}

test("combined creates and edits both lanes through their child assignments without duplicate Scores", async () => {
  const { rows, write } = combinedFixture();
  for (const studentId of [8, 9]) {
    const first = await write(studentId, 20);
    for (const score of [45, 10, 0]) {
      const result = await write(studentId, score);
      assert.equal(result.id, first.id);
      assert.equal(result.assignmentId, studentId + 20);
      assert.equal(result.score, score);
    }
  }
  assert.equal(rows.length, 2);
  await assert.rejects(() => write(8, 51), /exceeds/);
  await assert.rejects(() => write(8, 30, 99), /coverage/);
});

test("combined score save retries transient PostgreSQL serialization conflicts", async () => {
  const { client, rows, write } = combinedFixture();
  const transaction = client.$transaction;
  let attempts = 0;
  client.$transaction = async (callback: any) => {
    attempts++;
    if (attempts < 3) throw Object.assign(new Error("write conflict"), { code: "P2034" });
    return transaction(callback);
  };
  const result = await write(8, 20);
  assert.equal(attempts, 3);
  assert.equal(result.score, 20);
  assert.equal(rows.length, 1);
});

for (const lock of ["assignment", "term"]) {
  test(`combined ${lock} lock rejects edits without altering scores`, async () => {
    const { rows, classes, children, write } = combinedFixture();
    await write(8, 20);
    if (lock === "term") classes[0].termMappings[0].term.isLocked = true;
    else children[0].assignment.isLocked = true;
    await assert.rejects(() => write(8, 40), /locked/);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].score, 20);
    assert.equal(rows[0].id, 100);
  });
}
