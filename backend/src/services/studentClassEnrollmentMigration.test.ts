import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const schema = fs.readFileSync(path.resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
const migration = fs.readFileSync(
  path.resolve(
    process.cwd(),
    "../docs/migration-ledger-archive/legacy-active-migrations/20260823000000_add_student_class_enrollment_phase_1/migration.sql",
  ),
  "utf8",
);
const audit = fs.readFileSync(
  path.resolve(process.cwd(), "prisma/audits/student-class-history-conflicts.sql"),
  "utf8",
);

test("Phase 1 schema keeps subject Enrollment separate from class history", () => {
  const subjectEnrollment = schema.match(/model Enrollment \{[\s\S]*?\n\}/)?.[0] || "";
  const classEnrollment = schema.match(/model StudentClassEnrollment \{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(subjectEnrollment, /subjectId\s+Int/);
  assert.doesNotMatch(subjectEnrollment, /classNameSnapshot|startedAt|status/);
  assert.match(classEnrollment, /classNameSnapshot\s+String/);
  assert.match(classEnrollment, /classId\s+Int\?/);
  assert.match(classEnrollment, /onDelete: SetNull/);
  assert.doesNotMatch(classEnrollment, /academicYear/);
});

test("archived Phase 1 migration remains staged and non-destructive", () => {
  assert.doesNotMatch(migration, /(?:^|;)\s*(?:DELETE|TRUNCATE|DROP\s+(?:TABLE|TYPE|COLUMN))\b/im);
  assert.match(migration, /ALTER COLUMN "classId" DROP NOT NULL/);
  assert.doesNotMatch(migration, /UPDATE\s+"Student"/i);
  assert.doesNotMatch(migration, /SET\s+"classId"\s*=\s*NULL/i);
  assert.match(migration, /ADD COLUMN "archivedAt" TIMESTAMP\(3\)/);
});

test("backfill creates one honest snapshot per existing Student", () => {
  assert.match(migration, /FROM "Student" AS student\s+INNER JOIN "Class" AS class ON class\."id" = student\."classId"/s);
  assert.match(migration, /WHEN student\."isArchived" THEN 'HISTORICAL'/);
  assert.match(migration, /ELSE 'CURRENT'/);
  assert.match(migration, /student\."classId",\s+class\."name",\s+NULL,\s+NULL,/s);
  assert.match(migration, /'PHASE_1_BACKFILL'/);
  assert.doesNotMatch(migration, /student\."createdAt"/);
});

test("database enforces at most one CURRENT enrollment per Student", () => {
  assert.match(
    migration,
    /CREATE UNIQUE INDEX "StudentClassEnrollment_one_current_per_student_idx"[\s\S]*ON "StudentClassEnrollment"\("studentId"\)[\s\S]*WHERE "status" = 'CURRENT'::"StudentClassEnrollmentStatus"/,
  );
});

test("foreign keys retain Students and snapshot class identity", () => {
  assert.match(migration, /REFERENCES "Student"\("id"\) ON DELETE RESTRICT/);
  assert.match(migration, /REFERENCES "Class"\("id"\) ON DELETE SET NULL/);
});

test("conflict audit is read-only and covers genuine class-bearing evidence", () => {
  assert.doesNotMatch(audit, /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE)\b/i);
  for (const source of ["ReportCard", "Transcript", "AssessmentScore", "Score", "AttendanceEntry", "Grade", "ReportComment", "Discipline"]) {
    assert.match(audit, new RegExp(`"${source}"`));
  }
  assert.match(audit, /IS DISTINCT FROM student\."classId"/);
});
