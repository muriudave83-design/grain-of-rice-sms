import assert from "node:assert/strict";
import test from "node:test";
import { reportPrintBlockReason } from "./reportPrintEligibility.js";

const report = (studentId, completenessState, comment = "") => ({
  studentId,
  subjects: [{ completenessState, comment }],
});

test("printing is blocked before assignment inclusion approval and allowed after activation", () => {
  assert.match(reportPrintBlockReason([report(1, "REVIEW_REQUIRED")]), /administrator must review/i);
  assert.equal(reportPrintBlockReason([report(1, "COMPLETE")]), null);
});

test("blank comments do not block printing", () => {
  assert.equal(reportPrintBlockReason([report(1, "COMPLETE", "")]), null);
});

test("incomplete marks remain a printing blocker", () => {
  assert.match(reportPrintBlockReason([report(1, "INCOMPLETE")]), /complete all required marks/i);
});

test("selected-student printing evaluates only the selected report", () => {
  assert.equal(reportPrintBlockReason([report(1, "COMPLETE"), report(2, "REVIEW_REQUIRED")], 1), null);
  assert.match(reportPrintBlockReason([report(1, "COMPLETE"), report(2, "REVIEW_REQUIRED")], 2), /administrator must review/i);
});
