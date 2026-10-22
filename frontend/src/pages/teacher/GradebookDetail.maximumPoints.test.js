import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./GradebookDetail.jsx", import.meta.url), "utf8");

test("assignment menu opens a maximum-points dialog with the current value", () => {
  assert.match(source, />\s*Edit Maximum Points\s*</);
  assert.match(source, /String\(contextMenu\.assignment\.maxPoints \?\? 100\)/);
});

test("maximum-point save uses a concurrency precondition and refreshes assignment calculations", () => {
  assert.match(source, /patch\([\s\S]*\/max-points/);
  assert.match(source, /expectedMaxPoints: maximumPointsDialog\.assignment\.maxPoints/);
  assert.match(source, /assignments: current\.assignments\.map/);
  assert.match(source, /calculateAssignmentWeightedGrade\(student\.id, assignments\)/);
  assert.match(source, /getLetterGrade\(avg\)/);
});

test("dialog reports backend errors and does not close on failure", () => {
  assert.match(source, /setMaximumPointsDialog\(\(current\) => \(\{ \.\.\.current, saving: false, error: message \}\)\)/);
  assert.match(source, /maximumPointsDialog\.error && <p role="alert"/);
});
