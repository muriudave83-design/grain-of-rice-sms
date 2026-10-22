import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  activeHandoverForAssignment,
  createTeacherSubjectHandover,
  revokeTeacherSubjectHandover,
  TeacherSubjectHandoverError,
} from "./teacherSubjectHandover.service";

const original = { id: 10, teacherId: 1, classId: 6, subjectId: 20, isActive: false };
const replacement = { id: 11, teacherId: 2, classId: 6, subjectId: 20, isActive: true };
const term = { id: 30, classId: 6 };

function creationClient(overrides: any = {}) {
  const created: any[] = [];
  const scopes: any[] = [];
  const subjects = new Map([[10, original], [11, replacement], ...(overrides.subjects ?? [])]);
  const tx = {
    teacherSubject: { findUnique: async ({ where }: any) => subjects.get(where.id) ?? null },
    term: { findUnique: async () => overrides.term ?? term },
    teacherSubjectHandover: { create: async ({ data }: any) => {
      if (overrides.duplicate) throw Object.assign(new Error("duplicate"), { code: "P2002" });
      created.push(data); return { id: 90, ...data };
    } },
    assignment: { findFirst: async () => overrides.hasAssignments === false ? null : { id: 50 } },
    gradeContributionScope: { upsert: async (args: any) => { scopes.push(args); return args; } },
  };
  return { created, scopes, $transaction: async (fn: any) => fn(tx) };
}

test("admin creates an exact class-subject-term grant without changing academic records", async () => {
  const client = creationClient();
  const grant = await createTeacherSubjectHandover(client, {
    originalTeacherSubjectId: 10, replacementTeacherSubjectId: 11, termId: 30,
    createdByAdminId: 99, note: "Job to Victor",
  });
  assert.equal(grant.originalTeacherId, 1);
  assert.equal(grant.replacementTeacherId, 2);
  assert.deepEqual(client.created[0], {
    originalTeacherSubjectId: 10, replacementTeacherSubjectId: 11,
    originalTeacherId: 1, replacementTeacherId: 2,
    classId: 6, subjectId: 20, termId: 30,
    createdByAdminId: 99, note: "Job to Victor",
  });
  assert.equal(client.scopes.length, 1);
  assert.equal(client.scopes[0].update.mode, "REVIEWING");
});

test("mismatched class or subject cannot be authorized", async () => {
  const client = creationClient({ subjects: [[11, { ...replacement, subjectId: 999 }]] });
  await assert.rejects(
    () => createTeacherSubjectHandover(client, { originalTeacherSubjectId: 10, replacementTeacherSubjectId: 11, termId: 30, createdByAdminId: 99 }),
    (error: any) => error instanceof TeacherSubjectHandoverError && error.status === 409,
  );
  assert.equal(client.created.length, 0);
});

test("term boundary is exact and Grade 9 CRE cannot leak through another grant", async () => {
  const wrongTerm = creationClient({ term: { id: 31, classId: 9 } });
  await assert.rejects(
    () => createTeacherSubjectHandover(wrongTerm, { originalTeacherSubjectId: 10, replacementTeacherSubjectId: 11, termId: 31, createdByAdminId: 99 }),
    /Term must belong/,
  );
});

test("duplicate active grant is rejected", async () => {
  await assert.rejects(
    () => createTeacherSubjectHandover(creationClient({ duplicate: true }), { originalTeacherSubjectId: 10, replacementTeacherSubjectId: 11, termId: 30, createdByAdminId: 99 }),
    (error: any) => error.status === 409 && /already exists/.test(error.message),
  );
});

function accessClient(options: any = {}) {
  return {
    assignment: { findUnique: async () => ({
      id: 50, termId: options.termId ?? 30,
      term: { classId: options.termClassId ?? 6 },
      teacherSubject: options.teacherSubject ?? original,
      combinedAssignmentChild: options.combined ? { id: 1 } : null,
    }) },
    teacherSubjectHandover: { findFirst: async ({ where }: any) => {
      if (options.revoked || where.termId !== 30 || where.replacementTeacherId !== 2 || where.subjectId !== 20) return null;
      return { id: 90, isActive: true };
    } },
  };
}

test("replacement receives handover access while historical ownership remains Job", async () => {
  const access = await activeHandoverForAssignment(accessClient(), 2, 50);
  assert.equal(access.access, "HANDOVER");
  assert.equal(access.assignment.teacherSubject.teacherId, 1);
});

test("revocation immediately denies continuation access", async () => {
  await assert.rejects(() => activeHandoverForAssignment(accessClient({ revoked: true }), 2, 50), /No active handover/);
});

test("combined child assignments cannot be reached through a standard handover", async () => {
  await assert.rejects(() => activeHandoverForAssignment(accessClient({ combined: true }), 2, 50), /combined-group permission/);
});

test("revocation records administrator and timestamp instead of deleting the grant", async () => {
  let update: any;
  const tx = {
    teacherSubjectHandover: {
      findUnique: async () => ({ id: 90, isActive: true }),
      update: async (args: any) => { update = args; return args.data; },
    },
  };
  await revokeTeacherSubjectHandover({ $transaction: async (fn: any) => fn(tx) }, 90, 99);
  assert.equal(update.data.isActive, false);
  assert.equal(update.data.revokedByAdminId, 99);
  assert.ok(update.data.revokedAt instanceof Date);
});

test("migration is additive, constrained, and never rewrites marks or ownership", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "prisma/migrations/20261021000000_add_teacher_subject_handover/migration.sql"), "utf8");
  assert.match(sql, /CREATE TABLE "public"\."TeacherSubjectHandover"/);
  assert.match(sql, /WHERE "isActive" = true/);
  assert.match(sql, /ON DELETE RESTRICT/g);
  assert.doesNotMatch(sql, /\b(?:UPDATE|DELETE FROM|TRUNCATE)\s+"?(?:Assignment|Score|Grade|ReportCard|ReportComment)"?/i);
});
