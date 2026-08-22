import assert from "node:assert/strict";
import test from "node:test";
import { getGradeDescription, getLetterGrade } from "./grading.js";

const boundaries = [
  [100, "A"], [94, "A"], [93, "A-"], [90, "A-"], [89, "B+"], [88, "B+"],
  [87, "B"], [84, "B"], [83, "B-"], [80, "B-"], [79, "C+"], [78, "C+"],
  [77, "C"], [74, "C"], [73, "C-"], [70, "C-"], [69, "D+"], [68, "D+"],
  [67, "D"], [64, "D"], [63, "D-"], [60, "D-"], [59, "F"], [0, "F"],
];

test("frontend canonical grading boundaries", () => {
  for (const [score, letter] of boundaries) assert.equal(getLetterGrade(score), letter);
});
test("frontend canonical descriptions", () => {
  assert.equal(getGradeDescription("A-"), "Exceeding Expectations");
  assert.equal(getGradeDescription("B+"), "Meeting Expectations");
  assert.equal(getGradeDescription("C-"), "Approaching Expectations");
  assert.equal(getGradeDescription("D+"), "Below Expectations");
  assert.equal(getGradeDescription("F"), "Below Expectations");
});
