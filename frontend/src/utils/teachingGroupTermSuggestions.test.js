import assert from "node:assert/strict";
import test from "node:test";
import { suggestTermForLane } from "./teachingGroupTermSuggestions.js";

test("suggests only one normalized class-specific Term match", () => {
  const terms = [{ id: 8, classId: 1, name: "Term 3", academicYear: "2026" }, { id: 9, classId: 2, name: "term 3", academicYear: "2026" }];
  assert.equal(suggestTermForLane(terms, 1, " term   3 ", "2026"), "8");
  assert.equal(suggestTermForLane([...terms, { id: 10, classId: 1, name: "TERM 3", academicYear: "2026" }], 1, "Term 3", "2026"), "");
  assert.equal(suggestTermForLane(terms, 1, "Term 2", "2026"), "");
});
