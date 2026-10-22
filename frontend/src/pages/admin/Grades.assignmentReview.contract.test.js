import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./Grades.jsx", import.meta.url), "utf8");

test("administrator can review every subject assignment and activate the reviewed set", () => {
  assert.match(source, /contribution-scopes\/status/);
  assert.match(source, /contributionReview\.assignments\.map/);
  assert.match(source, /reviewAssignment\(assignment, "INCLUDED"\)/);
  assert.match(source, /reviewAssignment\(assignment, "EXCLUDED"\)/);
  assert.match(source, /contribution-scopes\/activate/);
});
