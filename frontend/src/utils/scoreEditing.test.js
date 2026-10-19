import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { beginSave, editSaveField, finishSave } from "./reliableSaveState.js";

const normal = fs.readFileSync(new URL("../pages/teacher/GradebookDetail.jsx", import.meta.url), "utf8");
const combined = fs.readFileSync(new URL("../pages/teacher/CombinedGradebook.jsx", import.meta.url), "utf8");

test("normal score input stays editable regardless of existing score and saves on blur or Enter", () => {
  assert.match(normal, /disabled=\{a.isLocked \|\| termLocked\}/);
  assert.match(normal, /scoreSaveStates\[key\]\?\.draftValue \?\?/);
  assert.match(normal, /if \(e.key === "Enter"\) e.currentTarget.blur\(\)/);
  assert.match(normal, /onBlur=\{\(e\) =>\s*handleScoreChange\(/);
  assert.match(normal, /apiClient.post\("\/teacher\/score", \{\s*studentId,\s*assignmentId,\s*score,/);
});

test("completed score save preserves a newer pending correction", () => {
  const saving = beginSave(editSaveField(null, 10, "20"), 10);
  const newer = editSaveField(saving, 10, "45");
  assert.equal(finishSave(newer, saving.sequence, 20), newer);
  assert.equal(newer.draftValue, "45");
});

test("combined input retains canonical save contract and assignment/period lock guards", () => {
  assert.match(combined, /disabled=\{data.readOnly \|\| assignment.isLocked\}/);
  assert.match(combined, /combinedAssignmentId: assignment.id, score, expectedScore: saving.serverValue/);
  assert.match(combined, /onBlur=\{\(event\) => saveScore\(student.id, assignment, event.target.value, persisted\)\}/);
});
