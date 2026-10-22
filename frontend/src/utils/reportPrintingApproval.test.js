import assert from "node:assert/strict";
import test from "node:test";
import { academicPeriodKey, approvalAcademicPeriods, eligibleApprovalAssignments, filterApprovalAssignments } from "./reportPrintingApproval.js";

const assignment = (id, classId, subjectId, termId = 12, term = { name: "Term 3", academicYear: 2026 }, status = "UNREVIEWED", safeToInclude = true) => ({ id, termId, term, teacherSubject: { classId, subjectId }, gradeContributionStatus: status, safeToInclude });

test("school-wide approval selection respects class and subject filters", () => {
  const rows = [assignment(1, 3, 5), assignment(2, 3, 6), assignment(3, 4, 5, 13)];
  assert.deepEqual(filterApprovalAssignments(rows, 3, 5).map((row) => row.id), [1]);
  assert.deepEqual(filterApprovalAssignments(rows, 3, "").map((row) => row.id), [1, 2]);
});

test("Term 3 2026 is one option and filters across class-specific term IDs", () => {
  const term3 = { name: "Term 3", academicYear: 2026 };
  const rows = [assignment(1, 3, 5, 12, term3), assignment(2, 4, 8, 13, term3), assignment(3, 5, 9, 14, { name: "Term 2", academicYear: 2026 })];
  const periods = approvalAcademicPeriods(rows);
  assert.deepEqual(periods.map(({ name, academicYear }) => ({ name, academicYear })), [{ name: "Term 3", academicYear: 2026 }, { name: "Term 2", academicYear: 2026 }]);
  assert.deepEqual(filterApprovalAssignments(rows, "", "", academicPeriodKey(term3)).map((row) => row.id), [1, 2]);
  assert.deepEqual(filterApprovalAssignments(rows, 4, "", academicPeriodKey(term3)).map((row) => row.id), [2]);
});

test("Grade 3 C.R.E. remains visible in the shared Term 3 period", () => {
  const term3 = { name: "Term 3", academicYear: 2026 };
  const rows = [assignment(31, 3, 17, 101, term3), assignment(41, 4, 17, 102, term3)];
  assert.deepEqual(filterApprovalAssignments(rows, 3, 17, academicPeriodKey(term3)).map((row) => row.id), [31]);
});

test("selection excludes unsafe, included, and previously excluded assignments", () => {
  const rows = [assignment(1, 3, 5), assignment(2, 3, 5, 12, undefined, "UNREVIEWED", false), assignment(3, 3, 5, 12, undefined, "INCLUDED"), assignment(4, 3, 5, 12, undefined, "EXCLUDED")];
  assert.deepEqual(eligibleApprovalAssignments(rows).map((row) => row.id), [1]);
});

test("eligible selection is derived only from currently visible assignments", () => {
  const term3 = { name: "Term 3", academicYear: 2026 };
  const rows = [assignment(1, 3, 5, 12, term3), assignment(2, 4, 5, 13, term3)];
  const visible = filterApprovalAssignments(rows, 3, "", academicPeriodKey(term3));
  assert.deepEqual(eligibleApprovalAssignments(visible).map((row) => row.id), [1]);
});
