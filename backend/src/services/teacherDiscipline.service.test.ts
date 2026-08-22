import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { Role } from "@prisma/client";
import { requireRole } from "../middlewares/rolesMiddleware";
import {
  createTeacherDisciplineRecord,
  listTeacherDisciplineRecords,
  listTeacherDisciplineStudents,
  listTeacherTerms,
} from "./teacherDiscipline.service";

const mockClient = (overrides: any = {}) => ({
  student: { findMany: async () => [], findFirst: async () => null },
  term: { findMany: async () => [], findFirst: async () => null },
  discipline: { findMany: async () => [], create: async () => ({}) },
  ...overrides,
});
const incidentAt = new Date("2026-08-22T07:35:00.000Z");

test("assigned class students are listed once, alphabetically, and archived students are excluded", async () => {
  let query: any;
  const students = [{ id: 1, classId: 6 }, { id: 2, classId: 6 }];
  const client = mockClient({ student: { findMany: async (args: any) => { query = args; return students; } } });
  assert.deepEqual(await listTeacherDisciplineStudents(client as any, 30), students);
  assert.equal(query.where.isArchived, false);
  assert.equal(query.where.class.teacherSubjects.some.teacherId, 30);
  assert.deepEqual(query.orderBy, [{ firstName: "asc" }, { lastName: "asc" }, { id: "asc" }]);
});

test("two assigned classes are represented by the relational TeacherSubject predicate", async () => {
  const expected = [{ id: 1, classId: 6 }, { id: 2, classId: 7 }];
  const client = mockClient({ student: { findMany: async () => expected } });
  assert.deepEqual(await listTeacherDisciplineStudents(client as any, 30), expected);
});

test("teacher discipline history is scoped through each student's assigned class", async () => {
  let query: any;
  const client = mockClient({ discipline: { findMany: async (args: any) => { query = args; return []; } } });
  await listTeacherDisciplineRecords(client as any, 30);
  assert.equal(query.where.student.class.teacherSubjects.some.teacherId, 30);
});

test("authorized teacher creates in the shared Discipline table with creator and empty note", async () => {
  let createArgs: any;
  const client = mockClient({
    student: { findFirst: async () => ({ id: 24, classId: 6, isArchived: false }) },
    term: { findFirst: async () => ({ id: 9, isLocked: false }) },
    discipline: { create: async (args: any) => { createArgs = args; return { id: 44, ...args.data }; } },
  });
  const result = await createTeacherDisciplineRecord(client as any, 30, { studentId: 24, termId: 9, type: " Late ", note: "", incidentAt });
  if (!("record" in result) || !result.record) assert.fail("record should be created");
  assert.equal(result.record.id, 44);
  assert.deepEqual(createArgs.data, { studentId: 24, termId: 9, type: "Late", notes: "", recordedById: 30, date: incidentAt });
});

test("unauthorized or archived studentId is rejected before Term lookup or create", async () => {
  let termCalled = false;
  let createCalled = false;
  const client = mockClient({
    student: { findFirst: async () => null },
    term: { findFirst: async () => { termCalled = true; } },
    discipline: { create: async () => { createCalled = true; } },
  });
  assert.deepEqual(await createTeacherDisciplineRecord(client as any, 30, { studentId: 99, termId: 9, type: "Late", incidentAt }), { error: "STUDENT_FORBIDDEN" });
  assert.equal(termCalled, false); assert.equal(createCalled, false);
});

test("Term from another class is rejected", async () => {
  const client = mockClient({
    student: { findFirst: async () => ({ id: 24, classId: 6, isArchived: false }) },
    term: { findFirst: async () => null },
  });
  assert.deepEqual(await createTeacherDisciplineRecord(client as any, 30, { studentId: 24, termId: 99, type: "Late", incidentAt }), { error: "TERM_FORBIDDEN" });
});

test("locked Term is rejected", async () => {
  const client = mockClient({
    student: { findFirst: async () => ({ id: 24, classId: 6, isArchived: false }) },
    term: { findFirst: async () => ({ id: 9, isLocked: true }) },
  });
  assert.deepEqual(await createTeacherDisciplineRecord(client as any, 30, { studentId: 24, termId: 9, type: "Late", incidentAt }), { error: "TERM_LOCKED" });
});

test("student-specific Term list is class-scoped and naturally includes Term 3", async () => {
  let termQuery: any;
  const term3 = [{ id: 12, name: "Term 3", classId: 6 }];
  const client = mockClient({
    student: { findFirst: async () => ({ id: 24, classId: 6, isArchived: false }) },
    term: { findMany: async (args: any) => { termQuery = args; return term3; } },
  });
  assert.deepEqual(await listTeacherTerms(client as any, 30, 24), term3);
  assert.equal(termQuery.where.classId, 6);
});

test("Teacher-only middleware rejects Parent, Student, Attendance Officer, and Admin", () => {
  for (const role of [Role.PARENT, Role.STUDENT, Role.ATTENDANCE_OFFICER, Role.ADMIN]) {
    let status = 0; let nextCalled = false;
    const req = { user: { id: 1, role } } as any;
    const res = { status: (value: number) => { status = value; return res; }, json: () => res } as any;
    requireRole([Role.TEACHER])(req, res, () => { nextCalled = true; });
    assert.equal(status, 403); assert.equal(nextCalled, false);
  }
});

test("Teacher middleware accepts Teacher", () => {
  let nextCalled = false;
  requireRole([Role.TEACHER])({ user: { id: 30, role: Role.TEACHER } } as any, {} as any, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test("routes expose no teacher discipline ID read/update/delete surface and Admin CRUD remains Admin-only", () => {
  const teacherRoutes = fs.readFileSync(path.resolve(process.cwd(), "src/routes/teacher.routes.ts"), "utf8");
  const adminRoutes = fs.readFileSync(path.resolve(process.cwd(), "src/routes/discipline.routes.ts"), "utf8");
  assert.doesNotMatch(teacherRoutes, /discipline\/:id/);
  assert.match(adminRoutes, /requireRole\(\[Role\.ADMIN\]\)/);
  assert.match(adminRoutes, /router\.get\("\/"/);
  assert.match(adminRoutes, /router\.put\("\/:id"/);
  assert.match(adminRoutes, /router\.delete\("\/:id"/);
});

test("shared Admin page retains name/admission search and displays creator", () => {
  const search = fs.readFileSync(path.resolve(process.cwd(), "../frontend/src/components/StudentSearchSelect.jsx"), "utf8");
  const admin = fs.readFileSync(path.resolve(process.cwd(), "../frontend/src/pages/admin/Discipline.jsx"), "utf8");
  assert.match(search, /firstName/); assert.match(search, /lastName/); assert.match(search, /admissionNo/);
  assert.match(admin, /Recorded By/); assert.match(admin, /apiClient\.get\("\/discipline"\)/);
});
