import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const schema = fs.readFileSync(path.resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
const migration = fs.readFileSync(
  path.resolve(
    process.cwd(),
    "../docs/migration-ledger-archive/legacy-active-migrations/20260822000000_add_teacher_subject_lifecycle/migration.sql",
  ),
  "utf8",
);

test("archived TeacherSubject lifecycle migration is additive and defaults existing/current rows active", () => {
  const model = schema.match(/model TeacherSubject \{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(model, /isActive\s+Boolean\s+@default\(true\)/);
  assert.match(migration, /ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true/);
});

test("migration preserves all academic and TeacherSubject rows", () => {
  assert.doesNotMatch(migration, /\b(?:DELETE|DROP|TRUNCATE|UPDATE)\b/i);
  assert.match(migration, /CREATE INDEX "TeacherSubject_teacherId_isActive_idx"/);
  assert.match(migration, /CREATE INDEX "TeacherSubject_classId_subjectId_isActive_idx"/);
});

test("existing authorship relations and uniqueness remain intact", () => {
  assert.match(schema, /teacherSubject\s+TeacherSubject\s+@relation\(fields: \[teacherSubjectId\], references: \[id\], onDelete: Cascade\)/);
  assert.match(schema, /teacherSubject\s+TeacherSubject\s+@relation\(fields: \[teacherSubjectId\], references: \[id\]\)/);
  assert.match(schema, /@@unique\(\[teacherId, subjectId, classId\], map: "TeacherSubject_unique_assignment"\)/);
});
