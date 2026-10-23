import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

test("administrator class reports are read-only and ADMIN-only", () => {
  const route = read("src/routes/admin/admin.reports.routes.ts");
  assert.match(route, /router\.use\(authenticate, requireRole\(\["ADMIN"\]\)\)/);
  assert.match(route, /router\.get\("\/reports\/classes\/:classId\/terms\/:termId"/);
  assert.doesNotMatch(route, /router\.(post|put|patch|delete)\(/);
});

test("administrator class reports enforce class-term isolation and do not impersonate a teacher", () => {
  const route = read("src/routes/admin/admin.reports.routes.ts");
  assert.match(route, /where: \{ id: termId, classId \}/);
  assert.match(route, /loadClassReports\(prisma/);
  assert.doesNotMatch(route, /requestingTeacherId/);
});

test("teacher authorization remains assignment-based and uses the shared report loader", () => {
  const controller = read("src/controllers/teacher.controller.ts");
  const routes = read("src/routes/teacher.routes.ts");
  assert.match(routes, /router\.use\(authenticate, requireRole\(\["TEACHER"\]\)\)/);
  assert.match(controller, /where: \{ classId, teacherId, isActive: true/);
  assert.match(controller, /loadClassReports\(prisma,[\s\S]*requestingTeacherId: teacherId/);
});

test("shared loader uses authoritative results, official attendance, and comments", () => {
  const service = read("src/services/classReport.service.ts");
  assert.match(service, /loadAuthoritativeReportResults/);
  assert.match(service, /loadReportAttendance/);
  assert.match(service, /includeComments: true/);
});
