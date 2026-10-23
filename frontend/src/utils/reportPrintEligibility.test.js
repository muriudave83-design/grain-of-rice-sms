import assert from "node:assert/strict";
import test from "node:test";
import { reportPrintBlockReason } from "./reportPrintEligibility.js";

const report = (studentId, completenessState, comment = "", needsRevalidation = false) => ({
  studentId,
  subjects: [{
    completenessState,
    comment,
    needsRevalidation,
    finalGrade: completenessState === "INCOMPLETE" ? null : 85,
  }],
});

test("administrator review status never blocks teacher printing", () => {
  assert.equal(reportPrintBlockReason([report(1, "REVIEW_REQUIRED")]), null);
  assert.equal(reportPrintBlockReason([report(1, "COMPLETE")]), null);
});

test("blank comments do not block printing", () => {
  assert.equal(reportPrintBlockReason([report(1, "COMPLETE", "")]), null);
});

test("incomplete marks remain a printing blocker", () => {
  assert.match(reportPrintBlockReason([report(1, "INCOMPLETE")]), /complete all required marks/i);
  assert.match(reportPrintBlockReason([{ studentId: 1, subjects: [{ completenessState: "NO_INCLUDED_ASSIGNMENTS", finalGrade: null }] }]), /complete all required marks/i);
});

test("selected-student printing evaluates only the selected report", () => {
  assert.equal(reportPrintBlockReason([report(1, "COMPLETE"), report(2, "INCOMPLETE")], 1), null);
  assert.match(reportPrintBlockReason([report(1, "COMPLETE"), report(2, "INCOMPLETE")], 2), /complete all required marks/i);
});

test("genuine revalidation remains a printing blocker", () => {
  assert.match(reportPrintBlockReason([report(1, "PUBLISHED", "", true)]), /changed or inconsistent/i);
});
