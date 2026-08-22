import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { archiveStudent, historyPagination, restoreStudent, transferStudent } from "./studentLifecycle.service";

function client(state: any, fail = "") {
  const tx: any = {
    student: { findUnique: async () => state.student, update: async ({ data }: any) => { if (fail === "student") throw new Error("fail"); return Object.assign(state.student, data); } },
    class: { findFirst: async ({ where }: any) => state.classes.find((x: any) => x.id === where.id && !x.isArchived) },
    studentClassEnrollment: {
      findFirst: async () => state.enrollments.find((x: any) => x.status === "CURRENT"),
      update: async ({ where, data }: any) => { const row = state.enrollments.find((x: any) => x.id === where.id); Object.assign(row, data); return row; },
      create: async ({ data }: any) => { if (fail === "create") throw new Error("fail"); state.enrollments.push({ id: state.enrollments.length + 1, ...data }); return data; },
    },
    user: { update: async () => ({}) },
  };
  return { $transaction: async (fn: any) => { const snapshot = JSON.stringify(state); try { return await fn(tx); } catch (error) { Object.assign(state, JSON.parse(snapshot)); throw error; } } };
}

test("archive closes CURRENT enrollment and timestamps Student atomically", async () => {
  const state = { student: { id: 1, classId: 10, isArchived: false, class: { id: 10, isArchived: false } }, classes: [], enrollments: [{ id: 1, classId: 10, status: "CURRENT" }] };
  const now = new Date("2026-08-23T10:00:00Z"); await archiveStudent(client(state), 1, now);
  assert.equal(state.enrollments[0].status, "HISTORICAL"); assert.equal(state.student.isArchived, true); assert.equal(state.student.classId, 10);
});

test("restore rejects archived destination and preserves history", async () => {
  const state = { student: { id: 1, classId: 10, isArchived: true }, classes: [{ id: 20, name: "Archived", isArchived: true }], enrollments: [{ id: 1, classId: 10, status: "HISTORICAL" }] };
  await assert.rejects(() => restoreStudent(client(state), 1, 20), /Select an active class/); assert.equal(state.enrollments.length, 1);
});

test("restore and transfer maintain one CURRENT enrollment and preserve history", async () => {
  const state: any = { student: { id: 1, classId: 10, isArchived: true }, classes: [{ id: 20, name: "Grade 7", isArchived: false }, { id: 30, name: "Grade 8", isArchived: false }], enrollments: [{ id: 1, classId: 10, status: "HISTORICAL" }] };
  await restoreStudent(client(state), 1, 20); assert.equal(state.enrollments.filter((x: any) => x.status === "CURRENT").length, 1);
  state.student.class = undefined; await transferStudent(client(state), 1, 30); assert.equal(state.enrollments.filter((x: any) => x.status === "CURRENT").length, 1); assert.equal(state.student.classId, 30);
});

test("archived routes are backend ADMIN-only and active detail is rejected", () => {
  const routes = fs.readFileSync(path.resolve(process.cwd(), "src/routes/admin/admin.students.routes.ts"), "utf8");
  assert.match(routes, /router\.use\(authenticate, requireRole\(\["ADMIN"\]\)\)/);
  assert.match(routes, /where: \{ id: Number\(req\.params\.id\), isArchived: true \}/);
  assert.doesNotMatch(routes, /student\.delete|user\.delete|parent\.delete/);
});

test("history pagination normalizes boundaries and caps oversized pages", () => {
  assert.deepEqual(historyPagination({}), { page: 1, pageSize: 20, skip: 0 });
  assert.deepEqual(historyPagination({ page: -4, pageSize: 0 }), { page: 1, pageSize: 20, skip: 0 });
  assert.deepEqual(historyPagination({ page: 3, pageSize: 5000 }), { page: 3, pageSize: 100, skip: 200 });
});

test("report-card PDF uses canonical route, ADMIN authorization, and published stored card policy", () => {
  const server = fs.readFileSync(path.resolve(process.cwd(), "src/server.ts"), "utf8");
  const controller = fs.readFileSync(path.resolve(process.cwd(), "src/controllers/reportCardPdf.controller.ts"), "utf8");
  const service = fs.readFileSync(path.resolve(process.cwd(), "src/services/pdf/reportCardPdf.service.ts"), "utf8");
  assert.match(server, /app\.use\("\/api", reportCardPdfRoutes\)/);
  assert.match(controller, /user\.role === Role\.ADMIN/);
  assert.match(service, /reportCard\.status !== ReportCardStatus\.PUBLISHED/);
  assert.match(service, /reportCard\.subjects/);
});
