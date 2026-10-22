import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

/* global process */

const read = (relative) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

test("teacher printable report shows only present, absent, and late", () => {
  const source = read("src/components/report-cards/TeacherReportCardSheet.jsx");
  assert.match(source, /<strong>Present:<\/strong>/);
  assert.match(source, /<strong>Absent:<\/strong>/);
  assert.match(source, /<strong>Late:<\/strong>/);
  assert.doesNotMatch(source, /Attendance Rate|Draft days excluded|Incomplete submitted days|attendanceState/);
  assert.ok(source.indexOf("Present:") < source.indexOf("Absent:") && source.indexOf("Absent:") < source.indexOf("Late:"));
});

test("administrator and parent report cards expose only the three official attendance fields", () => {
  const administrator = read("src/pages/student/StudentReportCardView.jsx");
  const parent = read("src/pages/parent/report-cards/ParentReportCardView.jsx");
  for (const source of [administrator, parent]) {
    assert.match(source, />Present(?::)?</);
    assert.match(source, />Absent(?::)?</);
    assert.match(source, />Late(?::)?</);
    assert.doesNotMatch(source, /Attendance Rate|draft attendance|incomplete submitted|Days Absent/);
    assert.ok(source.indexOf("Present") < source.indexOf("Absent") && source.indexOf("Absent") < source.indexOf("Late"));
  }
});

test("student and parent views expose official versus draft attendance state", () => {
  const student = read("src/pages/student/StudentAttendance.jsx");
  const parent = read("src/pages/parent/attendance/ParentAttendanceSummary.jsx");
  assert.match(student, /percentage == null \? "Not available"/);
  assert.match(student, /still draft and are excluded from official totals/);
  assert.match(parent, /Draft; excluded from official reports/);
});
