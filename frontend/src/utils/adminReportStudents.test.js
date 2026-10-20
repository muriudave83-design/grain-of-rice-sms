import assert from "node:assert/strict";
import test from "node:test";
import { filterAndSortReportStudents, getStudentDisplayName } from "./adminReportStudents.js";

const students = [
  { id: 4, firstName: "Zuri", lastName: "Amani", classId: 2, class: { id: 2, name: "Grade 2" } },
  { id: 3, firstName: "Corylne", lastName: "Ndungu", classId: 1, class: { id: 1, name: "Grade 1" }, user: { name: "Corylne Wanjiku Ndungu" } },
  { id: 2, firstName: "Alice", lastName: "Kariuki", classId: 1, class: { id: 1, name: "Grade 1" } },
  { id: 1, firstName: "alice", lastName: "Kariuki", classId: 2, class: { id: 2, name: "Grade 2" } },
];

test("uses the canonical displayed full name, including middle names", () => {
  assert.equal(getStudentDisplayName(students[1]), "Corylne Wanjiku Ndungu");
});

test("sorts displayed names alphabetically with student id as a deterministic tie-breaker", () => {
  assert.deepEqual(filterAndSortReportStudents(students, "", "").map(({ id }) => id), [1, 2, 3, 4]);
});

test("matches first, middle, surname, partial, and reordered fragments case-insensitively", () => {
  for (const query of ["Corylne", "wanj", "NDUNGU", "Cory", "ndungu   corylne"]) {
    assert.deepEqual(filterAndSortReportStudents(students, query, "").map(({ id }) => id), [3], query);
  }
});

test("class filtering composes with search and an empty class searches the entire school", () => {
  assert.deepEqual(filterAndSortReportStudents(students, "alice", "").map(({ id }) => id), [1, 2]);
  assert.deepEqual(filterAndSortReportStudents(students, "alice", "1").map(({ id }) => id), [2]);
  assert.deepEqual(filterAndSortReportStudents(students, "missing", "").map(({ id }) => id), []);
});
