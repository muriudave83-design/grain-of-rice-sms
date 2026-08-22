import assert from "node:assert/strict";
import test from "node:test";
import { removeClassSubjectConfiguration } from "./classSubjectLifecycle.service";
import { setTeacherSubjectActive } from "./teacherSubjectLifecycle.service";

type TeacherSubject = { id: number; teacherId: number; classId: number; subjectId: number; isActive: boolean; teacher?: any; class?: any; subject?: any };

function clientFor(teacherSubjects: TeacherSubject[], hasClassSubject = true) {
  const state = {
    classSubjects: hasClassSubject ? [{ id: 5, classId: 20, subjectId: 7 }] : [] as any[],
    teacherSubjects: structuredClone(teacherSubjects),
    assignments: [{ id: 101, teacherSubjectId: 10 }],
    scores: [{ id: 201, assignmentId: 101 }],
    reportComments: [{ id: 301, teacherSubjectId: 10 }],
    grades: [{ id: 401, subjectId: 7 }],
    reportCards: [{ id: 501, classId: 20 }],
    transcripts: [{ id: 601, classId: 20 }],
  };
  const tx = {
    classSubject: {
      findUnique: async ({ where }: any) => state.classSubjects.find((row) => row.id === where.id) || null,
      delete: async ({ where }: any) => { state.classSubjects = state.classSubjects.filter((row) => row.id !== where.id); },
      create: async ({ data }: any) => {
        const row = { id: 6, ...data };
        state.classSubjects.push(row);
        return row;
      },
    },
    teacherSubject: {
      count: async ({ where }: any) => state.teacherSubjects.filter((row) =>
        row.classId === where.classId && row.subjectId === where.subjectId && row.isActive === where.isActive).length,
      findUnique: async ({ where }: any) => state.teacherSubjects.find((row) => row.id === where.id) || null,
      update: async ({ where, data }: any) => {
        const row = state.teacherSubjects.find((entry) => entry.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
      create: async ({ data }: any) => {
        const row = { id: 99, isActive: true, ...data };
        state.teacherSubjects.push(row);
        return row;
      },
    },
  };
  return {
    state,
    tx,
    $transaction: async (callback: any) => callback(tx),
  };
}

const historicalTeacher = (id = 10): TeacherSubject => ({
  id, teacherId: 30, classId: 20, subjectId: 7, isActive: false,
  teacher: { id: 30, role: "TEACHER", isActive: true, isArchived: false },
  class: { id: 20, isArchived: false },
  subject: { id: 7, isArchived: false },
});

test("an active TeacherSubject blocks ClassSubject removal", async () => {
  const client = clientFor([{ ...historicalTeacher(), isActive: true }]);
  assert.deepEqual(await removeClassSubjectConfiguration(client, 5), {
    status: "ACTIVE_ASSIGNMENTS", activeTeacherAssignmentCount: 1,
  });
  assert.equal(client.state.classSubjects.length, 1);
});

test("only inactive historical TeacherSubjects allow removal", async () => {
  const client = clientFor([historicalTeacher()]);
  assert.equal((await removeClassSubjectConfiguration(client, 5)).status, "REMOVED");
  assert.equal(client.state.classSubjects.length, 0);
  assert.equal(client.state.teacherSubjects.length, 1);
});

test("several inactive TeacherSubjects do not block removal", async () => {
  const client = clientFor([historicalTeacher(10), { ...historicalTeacher(11), teacherId: 31 }]);
  assert.equal((await removeClassSubjectConfiguration(client, 5)).status, "REMOVED");
});

test("one active TeacherSubject blocks even when another is inactive", async () => {
  const client = clientFor([historicalTeacher(10), { ...historicalTeacher(11), teacherId: 31, isActive: true }]);
  assert.equal((await removeClassSubjectConfiguration(client, 5)).status, "ACTIVE_ASSIGNMENTS");
});

test("no TeacherSubject permits removal and missing ClassSubject is idempotent", async () => {
  const client = clientFor([]);
  assert.equal((await removeClassSubjectConfiguration(client, 5)).status, "REMOVED");
  assert.equal((await removeClassSubjectConfiguration(client, 5)).status, "NOT_FOUND");
});

test("removal preserves every historical academic collection", async () => {
  const client = clientFor([historicalTeacher()]);
  const before = structuredClone({
    teacherSubjects: client.state.teacherSubjects,
    assignments: client.state.assignments,
    scores: client.state.scores,
    reportComments: client.state.reportComments,
    grades: client.state.grades,
    reportCards: client.state.reportCards,
    transcripts: client.state.transcripts,
  });
  await removeClassSubjectConfiguration(client, 5);
  assert.deepEqual({
    teacherSubjects: client.state.teacherSubjects,
    assignments: client.state.assignments,
    scores: client.state.scores,
    reportComments: client.state.reportComments,
    grades: client.state.grades,
    reportCards: client.state.reportCards,
    transcripts: client.state.transcripts,
  }, before);
});

test("ClassSubject can be restored and a replacement teacher assigned independently", async () => {
  const client = clientFor([historicalTeacher()]);
  await removeClassSubjectConfiguration(client, 5);
  await client.tx.classSubject.create({ data: { classId: 20, subjectId: 7 } });
  await client.tx.teacherSubject.create({ data: { teacherId: 31, classId: 20, subjectId: 7 } });
  assert.equal(client.state.classSubjects.length, 1);
  assert.equal(client.state.teacherSubjects.find((row) => row.teacherId === 30)?.isActive, false);
  assert.equal(client.state.teacherSubjects.find((row) => row.teacherId === 31)?.isActive, true);
});

test("the same historical teacher can reactivate after ClassSubject restoration", async () => {
  const client = clientFor([historicalTeacher()]);
  await removeClassSubjectConfiguration(client, 5);
  await client.tx.classSubject.create({ data: { classId: 20, subjectId: 7 } });
  assert.equal((await setTeacherSubjectActive(client, 10, true)).status, "UPDATED");
  assert.equal(client.state.teacherSubjects[0].isActive, true);
});

test("DELETE route remains ADMIN-only and reports active-assignment language", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const source = fs.readFileSync(path.resolve(__dirname, "../routes/admin/admin.classSubjects.routes.ts"), "utf8");
  assert.match(source, /router\.delete\([\s\S]*requireRole\(\[Role\.ADMIN\]\)/);
  assert.match(source, /End the active teacher assignment/);
});
