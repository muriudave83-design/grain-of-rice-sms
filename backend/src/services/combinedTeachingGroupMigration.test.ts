import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(__dirname, "../..");
const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const migration = fs.readFileSync(
  path.join(root, "prisma/migrations/20260827030000_add_combined_teaching_groups/migration.sql"),
  "utf8",
);
const executableSql = migration.replace(/--.*$/gm, "");

test("combined teaching migration is additive and does not rewrite academic data", () => {
  assert.doesNotMatch(executableSql, /\bDROP\s+(TABLE|COLUMN)\b/i);
  assert.doesNotMatch(executableSql, /\bDELETE\s+FROM\b/i);
  assert.doesNotMatch(executableSql, /\bUPDATE\s+"?(Assignment|Score|Grade|ReportCard|Transcript|TeacherSubject|Term)"?\b/i);
  for (const table of ["Assignment", "Score", "Grade", "ReportCard", "Transcript"]) {
    assert.doesNotMatch(executableSql, new RegExp(`ALTER TABLE "${table}"`));
  }
});

test("all seven orchestration models and canonical back-relations are present", () => {
  for (const model of [
    "TeachingGroup", "TeachingGroupClass", "TeachingGroupMember", "TeachingGroupPeriod",
    "TeachingGroupTerm", "CombinedAssignment", "CombinedAssignmentChild",
  ]) {
    assert.match(schema, new RegExp(`model ${model} \\{`));
    assert.match(migration, new RegExp(`CREATE TABLE "${model}"`));
  }
  assert.match(schema, /combinedAssignmentsCreated\s+CombinedAssignment\[\]/);
  assert.match(schema, /teachingGroupClasses\s+TeachingGroupClass\[\]/);
  assert.match(schema, /teachingGroupMembers\s+TeachingGroupMember\[\]/);
  assert.match(schema, /teachingGroupTerms\s+TeachingGroupTerm\[\]/);
  assert.match(schema, /combinedAssignmentChild\s+CombinedAssignmentChild\?/);
});

test("member mismatch is rejected by a class and subject comparison trigger", () => {
  assert.match(migration, /CREATE FUNCTION "validate_teaching_group_member"/);
  assert.match(migration, /lane_class_id\s*<>\s*member_class_id/);
  assert.match(migration, /lane_subject_id\s*<>\s*member_subject_id/);
  assert.match(migration, /TeachingGroupMember TeacherSubject must match its ClassSubject lane/);
});

test("term mapping rejects class and TeachingGroup mismatches", () => {
  assert.match(migration, /period_group_id\s*<>\s*lane_group_id/);
  assert.match(migration, /lane_class_id\s*<>\s*mapped_term_class_id/);
  assert.match(migration, /TeachingGroupTerm period and lane must belong to the same TeachingGroup/);
  assert.match(migration, /TeachingGroupTerm Term must belong to the lane Class/);
});

test("child mapping rejects group, mapped Term, and assignment-owner mismatches", () => {
  assert.match(migration, /CREATE FUNCTION "validate_combined_assignment_child"/);
  assert.match(migration, /period_group_id\s*<>\s*lane_group_id/);
  assert.match(migration, /child_term_id\s*<>\s*expected_term_id/);
  assert.match(migration, /child_teacher_subject_id\s*<>\s*expected_teacher_subject_id/);
  assert.match(migration, /Assignment_protect_combined_coordinates/);
});

test("only one active assignment owner and one idempotency key are permitted", () => {
  assert.match(migration, /CREATE UNIQUE INDEX "TeachingGroupMember_one_active_owner_idx"[\s\S]*?WHERE "isActive" = true AND "isAssignmentOwner" = true/);
  assert.match(schema, /@@unique\(\[teachingGroupPeriodId, requestKey\], map: "CombinedAssignment_period_request_key"\)/);
  assert.match(migration, /CREATE UNIQUE INDEX "CombinedAssignment_period_request_key"/);
});

test("schema can represent two class lanes with distinct Terms and ordinary Assignment children", () => {
  assert.match(schema, /classSubject\s+ClassSubject\s+@relation/);
  assert.match(schema, /teacherSubject\s+TeacherSubject\s+@relation/);
  assert.match(schema, /term\s+Term\s+@relation/);
  assert.match(schema, /assignment\s+Assignment\s+@relation/);
  assert.match(schema, /@@unique\(\[teachingGroupPeriodId, teachingGroupClassId\]/);
  assert.match(schema, /@@unique\(\[combinedAssignmentId, teachingGroupClassId\]/);
});

test("combined metadata cannot cascade-delete canonical academic parents", () => {
  for (const constraint of [
    "TeachingGroupClass_classSubject_fkey",
    "TeachingGroupMember_teacherSubject_fkey",
    "TeachingGroupTerm_term_fkey",
    "CombinedAssignment_creator_fkey",
  ]) {
    assert.match(migration, new RegExp(`${constraint}"[\\s\\S]*?ON DELETE RESTRICT`));
  }
  assert.match(migration, /CombinedAssignmentChild_assignment_fkey"[\s\S]*?REFERENCES "Assignment"\("id"\) ON DELETE CASCADE/);
  assert.doesNotMatch(migration, /REFERENCES "CombinedAssignmentChild"/);
});

test("lifecycle checks require endedAt exactly when a row is inactive", () => {
  for (const table of ["TeachingGroup", "TeachingGroupClass", "TeachingGroupMember"]) {
    assert.match(migration, new RegExp(`${table}_lifecycle_check"[\\s\\S]*?"isActive" = true AND "endedAt" IS NULL[\\s\\S]*?"isActive" = false AND "endedAt" IS NOT NULL`));
  }
});
