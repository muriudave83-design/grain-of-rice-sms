import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../pages/admin/AdminReportsPage.jsx", import.meta.url), "utf8");
const routes = fs.readFileSync(new URL("../routes/AppRoutes.jsx", import.meta.url), "utf8");

test("administrator report cards use the shared official sheet without comment editing", () => {
  assert.match(page, /TeacherReportCardSheet/);
  assert.doesNotMatch(page, /onComment(Change|Blur|Retry|Overwrite|Clear)/);
  assert.match(routes, /allowedRoles=\{\["ADMIN"\]\}[\s\S]*\/dashboard\/admin\/reports/);
});

test("administrator can preview and print one or all report cards", () => {
  assert.match(page, /\/admin\/reports\/classes\/\$\{classId\}\/terms\/\$\{termId\}/);
  assert.match(page, /reportsForMode\(reports, selectedStudentId, printMode\)/);
  assert.match(page, /PRINT_MODE\.SELECTED/);
  assert.match(page, /PRINT_MODE\.ALL/);
  assert.match(page, /window\.print\(\)/);
  assert.match(page, /Print \/ Save Selected as PDF/);
  assert.match(page, /Print \/ Save Entire Class as PDF/);
});

test("administrator printing uses the established incomplete-report safeguards", () => {
  assert.match(page, /reportPrintBlockReason\(reports, selectedId\)/);
  assert.match(page, /ask the relevant teacher to complete or revalidate/);
});

test("the existing individual academic summary remains reachable", () => {
  assert.match(page, /\/dashboard\/admin\/reports\/\$\{selectedStudentId\}/);
  assert.match(page, /Open academic summary/);
});
