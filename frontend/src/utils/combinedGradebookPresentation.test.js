import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { flattenCombinedRoster, visibleCombinedAssignments } from "./combinedGradebookPresentation.js";

test("combined roster flattens lanes without losing routing identity", () => {
  const rows = flattenCombinedRoster([
    { laneId: 18, class: { id: 8, name: "Grade 8" }, subject: { id: 80 }, term: { id: 800 }, students: [{ id: 1, classId: 8 }] },
    { laneId: 19, class: { id: 9, name: "Grade 9" }, subject: { id: 90 }, term: { id: 900 }, students: [{ id: 2, classId: 9 }] },
  ]);

  assert.deepEqual(rows.map(({ id, classId, laneId, class: schoolClass, subject, term }) => ({ id, classId, laneId, classIdentity: schoolClass.id, subjectIdentity: subject.id, termIdentity: term.id })), [
    { id: 1, classId: 8, laneId: 18, classIdentity: 8, subjectIdentity: 80, termIdentity: 800 },
    { id: 2, classId: 9, laneId: 19, classIdentity: 9, subjectIdentity: 90, termIdentity: 900 },
  ]);
});

test("one logical combined assignment produces one visible column", () => {
  const logical = { id: 50, title: "Fasihi", children: [{ assignmentId: 501 }, { assignmentId: 502 }] };
  assert.deepEqual(visibleCombinedAssignments([logical]), [logical]);
});

test("combined gradebook renders one table and exposes explicit rename", () => {
  const component = fs.readFileSync(new URL("../pages/teacher/CombinedGradebook.jsx", import.meta.url), "utf8");
  assert.equal((component.match(/<table\b/g) || []).length, 1);
  assert.equal((component.match(/visibleAssignments\.map/g) || []).length, 2);
  assert.match(component, />Rename</);
  assert.match(component, /studentId, combinedAssignmentId: assignment\.id/);
  assert.match(component, /key=\{student\.id\}/);
});
