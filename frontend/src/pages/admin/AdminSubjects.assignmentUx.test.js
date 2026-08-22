import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./AdminSubjects.jsx", import.meta.url), "utf8");

test("Assign Teacher uses a modal and never requests a database ID", () => {
  assert.doesNotMatch(source, /prompt\s*\(/);
  assert.doesNotMatch(source, /Enter Teacher ID|subjects\/\$\{[^}]+\}\/assign-teacher/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /Search by name or email/);
});

test("modal loads ClassSubject classes and submits through canonical lifecycle endpoint", () => {
  assert.match(source, /class-subjects\/by-subject\/\$\{subject\.id\}/);
  assert.match(source, /apiClient\.post\("\/admin\/teacher-subjects"/);
  assert.match(source, /teacherId:\s*Number\(selectedTeacherId\)/);
  assert.match(source, /classId:\s*Number\(selectedClassId\)/);
});

test("empty configuration, cancellation, failures and reactivation have explicit UX", () => {
  assert.match(source, /not assigned to any class yet/);
  assert.match(source, /closeAssignTeacher/);
  assert.match(source, /setAssignmentError/);
  assert.match(source, /assignment was reactivated/);
});
