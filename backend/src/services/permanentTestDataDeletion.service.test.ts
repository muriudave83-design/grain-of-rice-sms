import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  getStudentPermanentDeletePreview,
  getTeacherPermanentDeletePreview,
  permanentlyDeleteStudent,
  permanentlyDeleteTeacher,
} from "./permanentTestDataDeletion.service";

const models = ["studentClassEnrollment", "parentStudent", "guardian", "enrollment", "score",
  "assessmentScore", "grade", "reportCard", "reportCardSubjectEntry", "reportComment", "transcript",
  "transcriptEntry", "attendanceEntry", "discipline", "fee", "feePayment", "invoice", "sponsorship",
  "parentContactLog", "attendanceSession", "teacherSubject", "subject", "parent", "assignment", "auditLog"];

function clientFor(options: any = {}) {
  const calls: any[] = [];
  const client: any = { calls };
  for (const model of models) client[model] = {
    count: async () => options.counts?.[model] || 0,
    deleteMany: async (args: any) => { calls.push({ model, operation: "deleteMany", args }); if (options.fail === model) throw new Error("forced failure"); return { count: options.counts?.[model] || 0 }; },
    updateMany: async (args: any) => { calls.push({ model, operation: "updateMany", args }); return { count: options.counts?.[model] || 0 }; },
  };
  client.student = {
    ...client.student,
    findUnique: async () => options.student === null ? null : (options.student || { id: 205, firstName: "JAMES", lastName: "mWANGI", admissionNo: "001", classId: 2, isArchived: false, userId: 45, class: { id: 2, name: "PP1", isArchived: false }, user: { id: 45, name: "James", email: "student@test", role: "STUDENT" } }),
    delete: async (args: any) => { calls.push({ model: "student", operation: "delete", args }); },
    count: async () => options.counts?.student || 0,
  };
  client.user = {
    findUnique: async (args: any) => args.where.id === 45 && !options.teacher ? null : (options.teacher === null ? null : options.teacher || { id: args.where.id, name: "Test Teacher", email: "test@school.com", role: "TEACHER", isActive: false, isArchived: true }),
    findFirst: async () => ({ id: 1, email: "admin@school.com" }),
    delete: async (args: any) => { calls.push({ model: "user", operation: "delete", args }); },
  };
  client.$transaction = async (callback: any) => {
    const checkpoint = calls.length;
    try { return await callback(client); } catch (error) { calls.splice(checkpoint); throw error; }
  };
  return client;
}

test("Student dependency preview reports exact deletes while shared masters remain preserved", async () => {
  const client = clientFor({ counts: { attendanceEntry: 2, score: 3, parentStudent: 1, reportCard: 1, reportCardSubjectEntry: 4 } });
  const preview = await getStudentPermanentDeletePreview(client, 205);
  assert.equal(preview.willDelete.attendanceEntries, 2);
  assert.equal(preview.willDelete.reportEntries, 4);
  assert.equal(preview.willDelete.linkedUser, 1);
  assert.ok(preview.preserved.includes("Class") && preview.preserved.includes("Subjects") && preview.preserved.includes("Terms"));
});

test("Student deletion is deepest-first and never deletes shared Class, Subject, Term, Parent, or session", async () => {
  const client = clientFor();
  await permanentlyDeleteStudent(client, 205, "DELETE STUDENT 205");
  assert.equal(client.calls.at(-2).model, "student");
  assert.equal(client.calls.at(-1).model, "user");
  for (const model of ["class", "subject", "term", "parent", "attendanceSession"]) {
    assert.equal(client.calls.some((call: any) => call.model === model && call.operation.startsWith("delete")), false);
  }
});

test("wrong Student confirmation, missing Student, and transaction failure are safe", async () => {
  const wrong = clientFor();
  await assert.rejects(() => permanentlyDeleteStudent(wrong, 205, "DELETE"), (error: any) => error.status === 400);
  assert.equal(wrong.calls.length, 0);
  await assert.rejects(() => getStudentPermanentDeletePreview(clientFor({ student: null }), 999), (error: any) => error.status === 404);
  const failed = clientFor({ fail: "grade" });
  await assert.rejects(() => permanentlyDeleteStudent(failed, 205, "DELETE STUDENT 205"), /forced failure/);
  assert.equal(failed.calls.length, 0);
});

test("Teacher preview classifies owned children for deletion and shared attendance for reassignment", async () => {
  const client = clientFor({ counts: { teacherSubject: 2, assignment: 1, score: 3, reportComment: 1, attendanceSession: 2, attendanceEntry: 20 } });
  const preview = await getTeacherPermanentDeletePreview(client, 23, 1);
  assert.deepEqual(preview.willDelete, { scores: 3, assignments: 1, reportComments: 1, teacherSubjects: 2, auditLogs: 0, user: 1 });
  assert.equal(preview.willPreserveByReassignment.attendanceEntries, 20);
});

test("Teacher deletion preserves other Teachers and class structure and handles shared owner references", async () => {
  const client = clientFor();
  await permanentlyDeleteTeacher(client, 23, 1, "DELETE USER 23");
  assert.ok(client.calls.some((call: any) => call.model === "attendanceSession" && call.operation === "updateMany" && call.args.data.teacherId === 1));
  assert.ok(client.calls.some((call: any) => call.model === "discipline" && call.operation === "updateMany"));
  assert.ok(client.calls.some((call: any) => call.model === "teacherSubject" && call.operation === "deleteMany"));
  assert.equal(client.calls.some((call: any) => ["classSubject", "class", "term"].includes(call.model)), false);
});

test("Teacher role, shared identity links, confirmation, missing User and rollback are guarded", async () => {
  await assert.rejects(() => getTeacherPermanentDeletePreview(clientFor({ teacher: null }), 999, 1), (error: any) => error.status === 404);
  await assert.rejects(() => getTeacherPermanentDeletePreview(clientFor({ teacher: { id: 9, role: "ADMIN" } }), 9, 1), (error: any) => error.status === 400);
  const shared = clientFor({ counts: { guardian: 1 } });
  assert.equal((await getTeacherPermanentDeletePreview(shared, 23, 1)).allowDelete, false);
  await assert.rejects(() => permanentlyDeleteTeacher(clientFor(), 23, 1, "DELETE"), (error: any) => error.status === 400);
  const failed = clientFor({ fail: "assignment" });
  await assert.rejects(() => permanentlyDeleteTeacher(failed, 23, 1, "DELETE USER 23"), /forced failure/);
  assert.equal(failed.calls.length, 0);
});

test("permanent routes are explicitly Admin-only while normal deletion remains archive", () => {
  const students = fs.readFileSync(path.resolve(__dirname, "../routes/admin/admin.students.routes.ts"), "utf8");
  const users = fs.readFileSync(path.resolve(__dirname, "../routes/admin.users.routes.ts"), "utf8");
  assert.match(students, /router\.use\(authenticate, requireRole\(\["ADMIN"\]\)\)/);
  assert.match(students, /students\/:id\/permanent-delete-preview/);
  assert.match(students, /students\/:id\/permanent/);
  assert.match(users, /users\/:id\/permanent-delete-preview[\s\S]*requireRole\(\["ADMIN"\]\)/);
  assert.match(users, /users\/:id\/permanent[\s\S]*requireRole\(\["ADMIN"\]\)/);
  assert.match(students, /router\.delete\("\/students\/:id"[\s\S]*archiveStudent/);
});
