import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { classDeleteConfirmation, deleteClassWithData, getClassDeletePreview } from "./classDeletion.service";

const models = ["student", "teacherSubject", "assignment", "score", "reportComment", "classSubject", "term",
  "assessment", "assessmentScore", "grade", "reportCard", "reportCardSubjectEntry", "transcript",
  "transcriptEntry", "attendanceSession", "attendanceEntry", "discipline", "enrollment", "fee",
  "feePayment", "invoice", "sponsorship", "guardian", "parentStudent"];

function makeClient(counts: Record<string, number> = {}, failModel?: string) {
  const calls: any[] = [];
  const client: any = { calls };
  client.class = {
    findUnique: async () => ({ id: 24, name: "TEST CLASS", isArchived: false }),
    delete: async (args: any) => { calls.push({ model: "class", operation: "delete", args }); if (failModel === "class") throw new Error("forced failure"); },
  };
  for (const model of models) {
    client[model] = {
      count: async (args: any) => {
        calls.push({ model, operation: "count", args });
        if (model === "student") return args.where.isArchived ? (counts.archivedStudents || 0) : (counts.activeStudents || 0);
        if (model === "teacherSubject") {
          if (args.where.isActive) return counts.activeTeacherAssignments || 0;
          if (args.where.OR) return counts.historicalTeacherAssignments || 0;
          return counts.inactiveTeacherAssignments || counts.historicalTeacherAssignments || 0;
        }
        return counts[model] || 0;
      },
      deleteMany: async (args: any) => {
        calls.push({ model, operation: "deleteMany", args });
        if (failModel === model) throw new Error("forced failure");
        return { count: counts[model] || 0 };
      },
    };
  }
  client.$transaction = async (callback: any) => {
    const checkpoint = calls.length;
    try { return await callback(client); }
    catch (error) { calls.splice(checkpoint); throw error; }
  };
  return client;
}

test("empty disposable class can be permanently deleted after exact confirmation", async () => {
  const client = makeClient();
  const result = await deleteClassWithData(client, 24, "DELETE TEST CLASS");
  assert.equal(result.allowDelete, true);
  assert.equal(client.calls.at(-1).model, "class");
});

test("active Student blocks deletion and Student is never deleted", async () => {
  const client = makeClient({ activeStudents: 1 });
  const preview = await getClassDeletePreview(client, 24);
  assert.equal(preview.allowDelete, false);
  assert.equal(preview.blockers.activeStudents, 1);
  await assert.rejects(() => deleteClassWithData(client, 24, "DELETE TEST CLASS"), (error: any) => error.status === 409);
  assert.equal(client.calls.some((call: any) => call.model === "student" && call.operation.startsWith("delete")), false);
});

test("archived Students also block because Student.classId is required", async () => {
  assert.equal((await getClassDeletePreview(makeClient({ archivedStudents: 1 }), 24)).allowDelete, false);
});

test("active TeacherSubject blocks deletion", async () => {
  const preview = await getClassDeletePreview(makeClient({ activeTeacherAssignments: 1 }), 24);
  assert.equal(preview.allowDelete, false);
});

test("inactive TeacherSubject with history blocks unsafe cascade of historical ownership", async () => {
  const preview = await getClassDeletePreview(makeClient({ inactiveTeacherAssignments: 1, historicalTeacherAssignments: 1, assignment: 2, score: 3, reportComment: 1 }), 24);
  assert.equal(preview.allowDelete, false);
  assert.deepEqual(preview.historicalOwnership, { assignments: 2, scores: 3, reportComments: 1 });
});

test("history-free inactive TeacherSubject is disposable configuration", async () => {
  const client = makeClient({ inactiveTeacherAssignments: 1 });
  const preview = await deleteClassWithData(client, 24, "DELETE TEST CLASS");
  assert.equal(preview.allowDelete, true);
  assert.equal(preview.willDelete.historyFreeInactiveTeacherAssignments, 1);
  assert.ok(client.calls.some((call: any) => call.model === "teacherSubject" && call.operation === "deleteMany"));
});

test("ClassSubject and academic children are previewed and deleted without deleting Subject", async () => {
  const client = makeClient({ classSubject: 2, term: 1, assessment: 1, assessmentScore: 2, grade: 3,
    reportCard: 1, reportCardSubjectEntry: 4, transcript: 1, transcriptEntry: 4,
    attendanceSession: 2, attendanceEntry: 8, discipline: 1 });
  const preview = await deleteClassWithData(client, 24, "DELETE TEST CLASS");
  assert.equal(preview.willDelete.classSubjects, 2);
  for (const model of ["classSubject", "term", "assessment", "attendanceSession", "discipline", "grade", "reportCard", "transcript"]) {
    assert.ok(client.calls.some((call: any) => call.model === model && call.operation === "deleteMany"));
  }
  assert.equal(client.calls.some((call: any) => call.model === "subject"), false);
});

test("financial and permanent master data are previewed but never deleted", async () => {
  const client = makeClient({ activeStudents: 1, fee: 2, feePayment: 3, invoice: 1, sponsorship: 1 });
  const preview = await getClassDeletePreview(client, 24);
  assert.deepEqual(preview.financialReferences, { fees: 2, feePayments: 3, invoices: 1, sponsorships: 1 });
  for (const model of ["student", "user", "parent", "subject", "fee", "feePayment", "invoice", "sponsorship"]) {
    assert.equal(client.calls.some((call: any) => call.model === model && call.operation.startsWith("delete")), false);
  }
});

test("wrong confirmation rejects before deletion", async () => {
  const client = makeClient();
  await assert.rejects(() => deleteClassWithData(client, 24, "delete test class"), (error: any) => error.status === 400);
  assert.equal(client.calls.some((call: any) => call.operation.startsWith("delete")), false);
  assert.equal(classDeleteConfirmation("Test Class"), "DELETE TEST CLASS");
});

test("transaction failure rolls back all deletion operations", async () => {
  const client = makeClient({ term: 1 }, "term");
  await assert.rejects(() => deleteClassWithData(client, 24, "DELETE TEST CLASS"), /forced failure/);
  assert.equal(client.calls.some((call: any) => call.operation.startsWith("delete")), false);
});

test("routes remain ADMIN-only and archive preserves students and history", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../routes/admin/admin.classes.routes.ts"), "utf8");
  assert.match(source, /classes\/:id\/delete-preview[\s\S]*requireRole\(\["ADMIN"\]\)/);
  assert.match(source, /classes\/:id\/with-data[\s\S]*requireRole\(\["ADMIN"\]\)/);
  const archive = source.slice(source.indexOf('"/classes/:id/archive"'));
  assert.match(archive, /data:\s*\{[\s\S]*isArchived:\s*true/);
  assert.doesNotMatch(archive, /student\.(delete|update)|teacherSubject\.(delete|update)/);
});

test("active Admin class lists exclude archived classes while historical Class relations remain in schema", () => {
  const routes = fs.readFileSync(path.resolve(__dirname, "../routes/admin/admin.classes.routes.ts"), "utf8");
  const schema = fs.readFileSync(path.resolve(__dirname, "../../prisma/schema.prisma"), "utf8");
  assert.match(routes, /isArchived:\s*false/);
  assert.match(schema, /model ReportCard[\s\S]*class\s+Class\s+@relation/);
});

test("teacher class lists, gradebook, attendance and discipline exclude archived classes", () => {
  for (const file of [
    "../controllers/teacher.controller.ts", "../controllers/gradebookController.ts",
    "../controllers/gradebookGrid.controller.ts", "../services/attendance/attendanceSession.service.ts",
    "../services/teacherDiscipline.service.ts",
  ]) {
    assert.match(fs.readFileSync(path.resolve(__dirname, file), "utf8"), /isArchived:\s*false/, file);
  }
});
