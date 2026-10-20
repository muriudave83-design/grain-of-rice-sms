import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

test("administrator and teacher reports use the shared attendance service", () => {
  const administrator = read("src/controllers/reports.controller.ts");
  const teacher = read("src/routes/reportCardReadRoutes.ts");
  assert.match(administrator, /loadReportAttendance\(prisma/);
  assert.match(teacher, /loadReportAttendance\(prisma/);
  for (const source of [administrator, teacher]) {
    assert.match(source, /startDate:/);
    assert.match(source, /endDate:/);
  }
});

test("student report endpoint remains authenticated and role restricted", () => {
  const route = read("src/routes/reports.routes.ts");
  assert.match(route, /"\/student\/:studentId",\s*authenticate,\s*requireRole\(\["ADMIN", "TEACHER", "STUDENT", "PARENT"\]\)/s);
});
