import assert from "node:assert/strict";
import test from "node:test";
import { eligibleApprovalAssignments, filterApprovalAssignments } from "./reportPrintingApproval.js";

const assignment = (id, classId, subjectId, status = "UNREVIEWED", safeToInclude = true) => ({ id, teacherSubject: { classId, subjectId }, gradeContributionStatus: status, safeToInclude });

test("school-wide approval selection respects class and subject filters", () => {
  const rows = [{ ...assignment(1, 3, 5), termId: 12 }, { ...assignment(2, 3, 6), termId: 12 }, { ...assignment(3, 4, 5), termId: 13 }];
  assert.deepEqual(filterApprovalAssignments(rows, 3, 5).map((row) => row.id), [1]);
  assert.deepEqual(filterApprovalAssignments(rows, 3, "").map((row) => row.id), [1, 2]);
  assert.deepEqual(filterApprovalAssignments(rows, "", "", 13).map((row) => row.id), [3]);
});

test("selection excludes unsafe, included, and previously excluded assignments", () => {
  const rows = [assignment(1, 3, 5), assignment(2, 3, 5, "UNREVIEWED", false), assignment(3, 3, 5, "INCLUDED"), assignment(4, 3, 5, "EXCLUDED")];
  assert.deepEqual(eligibleApprovalAssignments(rows).map((row) => row.id), [1]);
});
