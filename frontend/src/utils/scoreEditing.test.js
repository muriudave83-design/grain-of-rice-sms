import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const normal = fs.readFileSync(new URL("../pages/teacher/GradebookDetail.jsx", import.meta.url), "utf8");
const combined = fs.readFileSync(new URL("../pages/teacher/CombinedGradebook.jsx", import.meta.url), "utf8");

test("normal score input stays editable regardless of existing score and saves on blur or Enter", () => {
  assert.match(normal, /disabled=\{a.isLocked \|\| termLocked\}/);
  assert.match(normal, /localScores\[key\] \?\?\s*\(scoreObj \? scoreObj.score : ""\)/);
  assert.match(normal, /if \(e.key === "Enter"\) e.currentTarget.blur\(\)/);
  assert.match(normal, /onBlur=\{\(e\) =>\s*handleScoreChange\(/);
  assert.match(normal, /apiClient.post\("\/teacher\/score", \{\s*studentId,\s*assignmentId,\s*score,/);
});

test("completed score save preserves a newer pending correction", () => {
  // Execute the actual state updater from the component against an in-flight edit.
  const body = normal.match(/setLocalScores\(\(prev\) => \{([\s\S]*?)return copy;\s*\}\);/)[1];
  const update = new Function("prev", "studentId", "assignmentId", "value", `${body} return copy;`);
  assert.deepEqual(update({ "1-10": "45" }, 1, 10, "20"), { "1-10": "45" });
  assert.deepEqual(update({ "1-10": "20", "2-10": "0" }, 1, 10, "20"), { "2-10": "0" });
});

test("combined input retains canonical save contract and assignment/period lock guards", () => {
  assert.match(combined, /disabled=\{data.readOnly \|\| assignment.isLocked\}/);
  assert.match(combined, /studentId, combinedAssignmentId: assignment.id, score: Number\(value\)/);
  assert.match(combined, /onBlur=\{\(event\) => saveScore\(student.id, assignment, event.target.value\)\}/);
});
