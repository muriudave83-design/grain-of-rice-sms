import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (relative) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

test("teacher printable report distinguishes missing attendance from zero percent", () => {
  const source = read("src/components/report-cards/TeacherReportCardSheet.jsx");
  assert.match(source, /attendanceRate === null/);
  assert.match(source, /Not available/);
  assert.match(source, /Draft days excluded/);
  assert.doesNotMatch(source, /attendanceRate \?\? 0/);
});

test("student and parent views expose official versus draft attendance state", () => {
  const student = read("src/pages/student/StudentAttendance.jsx");
  const parent = read("src/pages/parent/attendance/ParentAttendanceSummary.jsx");
  assert.match(student, /percentage == null \? "Not available"/);
  assert.match(student, /still draft and are excluded from official totals/);
  assert.match(parent, /Draft; excluded from official reports/);
});
