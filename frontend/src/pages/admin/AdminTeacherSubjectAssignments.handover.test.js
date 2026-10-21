import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const source = fs.readFileSync(path.resolve(process.cwd(), "src/pages/admin/AdminTeacherSubjectAssignments.jsx"), "utf8");

test("administrator handover UI uses authenticated application endpoints", () => {
  assert.match(source, /apiClient\.post\("\/admin\/teacher-subject-handovers"/);
  assert.match(source, /teacher-subject-handovers\/\$\{handover\.id\}\/revoke/);
  assert.match(source, /Original teacher assignment/);
  assert.match(source, /Permitted term/);
  assert.match(source, /Create this exact handover/);
  assert.match(source, /No other class, subject, or term will be authorized/);
});

test("replacement choices are restricted to the exact class and subject", () => {
  assert.match(source, /item\.class\?\.id === originalHandoverAssignment\.class\?\.id/);
  assert.match(source, /item\.subject\?\.id === originalHandoverAssignment\.subject\?\.id/);
});
