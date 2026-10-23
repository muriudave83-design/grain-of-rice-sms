import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { calculateCurrentAvailableGrade, calculateIncludedAssignments, calculateTeacherReportAssignments, resolveExplicitSubjectGrade } from "./gradeContribution.service";

const assignment = (id: number, status: any, score: number | null, studentId = 1) => ({
  id, weight: 1, maxPoints: 100, gradeContributionStatus: status,
  scores: score === null ? [] : [{ studentId, score }],
});

test("included assignments calculate complete grades and preserve zero", () => {
  assert.deepEqual(calculateIncludedAssignments(1, [assignment(1, "INCLUDED", 0)]), { status: "COMPLETE", value: 0, assignmentIds: [1] });
});

test("missing included scores remain incomplete", () => {
  assert.deepEqual(calculateIncludedAssignments(1, [assignment(1, "INCLUDED", null)]), { status: "INCOMPLETE", missingAssignmentIds: [1] });
});

test("unreviewed history blocks calculation while explicitly excluded history does not", () => {
  assert.deepEqual(calculateIncludedAssignments(1, [assignment(1, "UNREVIEWED", 80)]), { status: "REVIEW_REQUIRED", unreviewedAssignmentIds: [1] });
  assert.deepEqual(calculateIncludedAssignments(1, [assignment(1, "EXCLUDED", 20), assignment(2, "INCLUDED", 80)]), { status: "COMPLETE", value: 80, assignmentIds: [2] });
});

test("historical and current included assignments combine without teacher-owner heuristics", () => {
  const result = calculateIncludedAssignments(1, [assignment(10, "INCLUDED", 60), assignment(11, "INCLUDED", 80)]);
  assert.deepEqual(result, { status: "COMPLETE", value: 70, assignmentIds: [10, 11] });
});

test("final-grade publication calculation ignores missing zero-weight work", () => {
  assert.deepEqual(calculateIncludedAssignments(1, [
    assignment(1, "INCLUDED", 80),
    { ...assignment(2, "INCLUDED", null), weight: 0, maxPoints: 0 },
  ]), { status: "COMPLETE", value: 80, assignmentIds: [1] });
  assert.deepEqual(calculateIncludedAssignments(1, [
    { ...assignment(1, "INCLUDED", null), weight: 0 },
  ]), { status: "INCOMPLETE", missingAssignmentIds: [1] });
});

test("administrator review state is advisory for teacher reports while published grades remain authoritative", () => {
  assert.equal(resolveExplicitSubjectGrade({ studentId: 1, assignments: [], scope: null }), null);
  assert.deepEqual(resolveExplicitSubjectGrade({ studentId: 1, assignments: [assignment(1, "UNREVIEWED", 88)], scope: { mode: "REVIEWING", revision: 2 } }), { status: "COMPLETE", value: 88, assignmentIds: [1] });
  assert.deepEqual(resolveExplicitSubjectGrade({ studentId: 1, assignments: [assignment(1, "EXCLUDED", 88)], scope: { mode: "ACTIVE", revision: 2 } }), { status: "COMPLETE", value: 88, assignmentIds: [1] });
  assert.deepEqual(resolveExplicitSubjectGrade({ studentId: 1, assignments: [assignment(1, "UNREVIEWED", 10)], scope: { mode: "ACTIVE", revision: 2 }, published: { total: 91, contributionRevision: 1 } }), { status: "PUBLISHED", value: 91, needsRevalidation: true });
  assert.deepEqual(resolveExplicitSubjectGrade({ studentId: 1, assignments: [], scope: { mode: "ACTIVE", revision: 1 }, published: { total: 88, contributionRevision: null } }), { status: "PUBLISHED", value: 88, needsRevalidation: true });
  assert.deepEqual(resolveExplicitSubjectGrade({ studentId: 1, assignments: [], scope: { mode: "REVIEWING", revision: 2 }, published: { total: 88, contributionRevision: 1 } }), { status: "PUBLISHED", value: 88, needsRevalidation: true });
});

test("teacher reports retain missing and invalid mark safeguards regardless of review status", () => {
  assert.deepEqual(calculateTeacherReportAssignments(1, [assignment(1, "UNREVIEWED", null)]), { status: "INCOMPLETE", missingAssignmentIds: [1] });
  assert.deepEqual(calculateTeacherReportAssignments(1, [{ ...assignment(1, "EXCLUDED", 80), maxPoints: 0 }]), { status: "INCOMPLETE", missingAssignmentIds: [1] });
  assert.deepEqual(calculateTeacherReportAssignments(1, [{ ...assignment(1, "INCLUDED", 80), weight: Number.NaN }]), { status: "INCOMPLETE", missingAssignmentIds: [1] });
});

test("teacher reports use total earned over total possible, excluding zero weight", () => {
  assert.deepEqual(calculateTeacherReportAssignments(1, [
    { ...assignment(1, "INCLUDED", 18), maxPoints: 20 },
    { ...assignment(2, "INCLUDED", 30), maxPoints: 50 },
    { ...assignment(3, "INCLUDED", 8), maxPoints: 10 },
  ]), { status: "COMPLETE", value: 70, assignmentIds: [1, 2, 3] });
  assert.deepEqual(calculateTeacherReportAssignments(1, [
    { ...assignment(1, "UNREVIEWED", 50), weight: 1 },
    { ...assignment(2, "EXCLUDED", 100), weight: 3 },
    { ...assignment(3, "INCLUDED", null), weight: 0, maxPoints: 0 },
  ]), { status: "COMPLETE", value: 75, assignmentIds: [1, 2] });
  assert.deepEqual(calculateTeacherReportAssignments(1, [
    { ...assignment(1, "INCLUDED", null), weight: 0 },
  ]), { status: "INCOMPLETE", missingAssignmentIds: [1] });
  assert.deepEqual(calculateTeacherReportAssignments(1, [
    { ...assignment(1, "INCLUDED", 80), weight: -1 },
  ]), { status: "INCOMPLETE", missingAssignmentIds: [1] });
});

test("published grades remain authoritative while zero-weight work is ignored during revision verification", () => {
  assert.deepEqual(resolveExplicitSubjectGrade({
    studentId: 1,
    assignments: [
      { ...assignment(1, "INCLUDED", 77.3), weight: 1 },
      { ...assignment(225, "UNREVIEWED", null), weight: 0 },
    ],
    scope: { mode: "REVIEWING", revision: 2 },
    published: { total: 77.3, contributionRevision: 1 },
  }), { status: "PUBLISHED", value: 77.3, needsRevalidation: false });
});

test("legacy published grades are display-valid when complete current marks reproduce the stored total", () => {
  const assignments = [
    { ...assignment(1, "UNREVIEWED", 4), maxPoints: 5 },
    { ...assignment(2, "INCLUDED", 55), maxPoints: 60 },
    { ...assignment(3, "INCLUDED", 5), maxPoints: 5 },
  ];
  assert.equal(Number(calculateCurrentAvailableGrade(1, assignments)?.toFixed(1)), 91.4);
  assert.deepEqual(resolveExplicitSubjectGrade({
    studentId: 1, assignments, scope: { mode: "REVIEWING", revision: 1 },
    published: { total: 90.6, contributionRevision: null },
  }), { status: "PUBLISHED", value: 90.6, needsRevalidation: true });
});

test("genuinely changed or incomplete inputs retain published-grade revalidation", () => {
  const changed = [{ ...assignment(1, "INCLUDED", 80), maxPoints: 100 }];
  const changedResult = resolveExplicitSubjectGrade({
    studentId: 1, assignments: changed, scope: { mode: "ACTIVE", revision: 2 },
    published: { total: 91, contributionRevision: 1 },
  });
  assert.equal(changedResult?.status, "PUBLISHED");
  assert.equal(changedResult?.status === "PUBLISHED" && changedResult.needsRevalidation, true);
  const missing = [assignment(1, "INCLUDED", null)];
  const missingResult = resolveExplicitSubjectGrade({
    studentId: 1, assignments: missing, scope: { mode: "ACTIVE", revision: 2 },
    published: { total: 91, contributionRevision: 1 },
  });
  assert.equal(missingResult?.status, "PUBLISHED");
  assert.equal(missingResult?.status === "PUBLISHED" && missingResult.needsRevalidation, true);
});

test("migration auto-activates only authoritative active combined-assignment sets", () => {
  const migration = fs.readFileSync(path.resolve(process.cwd(), "prisma/migrations/20261020000000_add_grade_contribution_review/migration.sql"), "utf8");
  assert.match(migration, /CombinedAssignmentChild/);
  assert.match(migration, /combined\."deletedAt" IS NULL/);
  assert.match(migration, /BOOL_AND\(combined\."id" IS NOT NULL AND combined\."deletedAt" IS NULL\)/);
  assert.match(migration, /WHEN evidence\.all_active_combined THEN 'ACTIVE'/);
  assert.match(migration, /evidence\.all_active_combined OR evidence\.owner_count > 1/);
  assert.doesNotMatch(migration, /dateAssigned.*ACTIVE|isActive.*all_active_combined|score.*all_active_combined/is);
});
