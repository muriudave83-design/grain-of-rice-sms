import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { formatDisciplineDate, formatDisciplineTime, getSchoolDateTimeDefaults } from "./disciplineDateTime.js";

test("default fields use today's Nairobi date and current Nairobi time", () => {
  assert.deepEqual(getSchoolDateTimeDefaults(new Date("2026-08-22T07:35:00.000Z")), { date: "2026-08-22", time: "10:35" });
});

test("stored timestamp displays with the same Nairobi incident date and time", () => {
  const timestamp = "2026-08-22T07:35:00.000Z";
  assert.equal(formatDisciplineDate(timestamp), "22 Aug 2026");
  assert.equal(formatDisciplineTime(timestamp), "10:35 AM");
});

test("Teacher UX has labelled date/time fields, filtering, empty state, creator fallback, and responsive containment", () => {
  const source = fs.readFileSync(new URL("../pages/teacher/TeacherDiscipline.jsx", import.meta.url), "utf8");
  for (const text of ["Incident Date", "Incident Time", "Find records", "No discipline records yet", "Not recorded", "filterTermId", "overflow-x-hidden", "min-w-0"]) assert.match(source, new RegExp(text));
  assert.match(source, /htmlFor="incident-date"/); assert.match(source, /htmlFor="incident-time"/);
});

test("Admin and Teacher both use shared date/time formatters", () => {
  const teacher = fs.readFileSync(new URL("../pages/teacher/TeacherDiscipline.jsx", import.meta.url), "utf8");
  const admin = fs.readFileSync(new URL("../pages/admin/Discipline.jsx", import.meta.url), "utf8");
  for (const source of [teacher, admin]) {
    assert.match(source, /formatDisciplineDate/); assert.match(source, /formatDisciplineTime/);
  }
});
