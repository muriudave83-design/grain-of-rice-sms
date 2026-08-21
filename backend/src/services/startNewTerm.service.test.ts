import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient, Role } from "@prisma/client";
import { requireRole } from "../middlewares/rolesMiddleware";
import {
  getStartNewTermPreview,
  startNewTermForActiveClasses,
  validateStartNewTermInput,
} from "./startNewTerm.service";

const input = { name: "Term 3", academicYear: "2026", startDate: "2026-08-24", endDate: "2026-11-14" };
const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const active = (id: number, name: string, terms: any[] = []) => ({ id, name, isArchived: false, terms });
const archived = (id: number, name: string) => ({ id, name, isArchived: true, terms: [] });
const existing = (overrides: Record<string, unknown> = {}) => ({
  id: 50, name: "Term 2", academicYear: "2026", startDate: date("2026-04-27"),
  endDate: date("2026-07-31"), isLocked: true, ...overrides,
});

function makeClient(classes: any[], failClassId?: number) {
  const calls: Array<{ model: string; operation: string; args: any }> = [];
  let nextId = 100;
  const client: any = {
    class: { findMany: async () => classes },
    term: {
      create: async (args: any) => {
        calls.push({ model: "term", operation: "create", args });
        if (args.data.classId === failClassId) throw new Error("forced failure");
        return { id: nextId++, classId: args.data.classId };
      },
    },
  };
  client.$transaction = async (callback: (tx: any) => unknown) => {
    const checkpoint = calls.length;
    try { return await callback(client); }
    catch (error) { calls.splice(checkpoint); throw error; }
  };
  return { prisma: client as PrismaClient, calls };
}

test("1. create Term 3 for all active classes", async () => {
  const mock = makeClient([active(1, "PP1"), active(2, "PP2")]);
  const result = await startNewTermForActiveClasses(mock.prisma, input, "START TERM 3");
  assert.equal(result.totalCreated, 2);
  assert.deepEqual(result.created.map((item) => item.className), ["PP1", "PP2"]);
});
test("2. archived class excluded", async () => {
  const preview = await getStartNewTermPreview(makeClient([active(1, "PP1"), archived(2, "OLD")]).prisma, input);
  assert.deepEqual(preview.archivedClassesExcluded.map((item) => item.className), ["OLD"]);
  assert.equal(preview.totalCreate, 1);
});
test("3. exact duplicate skipped", async () => {
  const term = existing({ name: "Term 3", startDate: date(input.startDate), endDate: date(input.endDate) });
  const preview = await getStartNewTermPreview(makeClient([active(1, "PP1", [term])]).prisma, input);
  assert.equal(preview.totalSkip, 1); assert.equal(preview.totalConflicts, 0);
});
test("4. same term/year with different dates is a conflict", async () => {
  const term = existing({ name: "Term 3", startDate: date("2026-08-25"), endDate: date(input.endDate) });
  const preview = await getStartNewTermPreview(makeClient([active(1, "PP1", [term])]).prisma, input);
  assert.equal(preview.totalConflicts, 1);
});
test("5. overlapping different Term is a conflict", async () => {
  const term = existing({ endDate: date("2026-09-10") });
  const preview = await getStartNewTermPreview(makeClient([active(1, "PP1", [term])]).prisma, input);
  assert.equal(preview.totalConflicts, 1);
});
test("6. non-overlapping old Term is allowed", async () => {
  const preview = await getStartNewTermPreview(makeClient([active(1, "PP1", [existing()])]).prisma, input);
  assert.equal(preview.totalCreate, 1); assert.equal(preview.totalConflicts, 0);
});
test("7. invalid dates rejected", () => {
  assert.throws(() => validateStartNewTermInput({ ...input, startDate: "2026-11-14", endDate: "2026-08-24" }));
  assert.throws(() => validateStartNewTermInput({ ...input, startDate: "2026-02-30" }));
});
test("8. empty academic year rejected", () => assert.throws(() => validateStartNewTermInput({ ...input, academicYear: "" })));
test("9. invalid Term name rejected", () => assert.throws(() => validateStartNewTermInput({ ...input, name: "Third Term" })));
test("10. no active classes rejected", async () => {
  await assert.rejects(() => getStartNewTermPreview(makeClient([archived(2, "OLD")]).prisma, input));
});
test("11. transaction rollback if one create fails", async () => {
  const mock = makeClient([active(1, "PP1"), active(2, "PP2")], 2);
  await assert.rejects(() => startNewTermForActiveClasses(mock.prisma, input, "START TERM 3"));
  assert.equal(mock.calls.length, 0);
});
test("12. non-Admin receives 403", () => {
  let status = 0;
  const response = { status(code: number) { status = code; return this; }, json() { return this; } };
  requireRole([Role.ADMIN])({ user: { id: 2, role: Role.TEACHER } } as any, response as any, () => assert.fail());
  assert.equal(status, 403);
});
test("13. preview performs no writes", async () => {
  const mock = makeClient([active(1, "PP1")]); await getStartNewTermPreview(mock.prisma, input); assert.equal(mock.calls.length, 0);
});
for (const [number, label] of [[14, "TeacherSubject/ClassSubject"], [15, "Students/Users"], [16, "historical Term data"]] as const) {
  test(`${number}. existing ${label} unchanged`, async () => {
    const mock = makeClient([active(1, "PP1", [existing()])]);
    await startNewTermForActiveClasses(mock.prisma, input, "START TERM 3");
    assert.deepEqual([...new Set(mock.calls.map((call) => `${call.model}.${call.operation}`))], ["term.create"]);
  });
}
test("typed confirmation is enforced", async () => {
  const mock = makeClient([active(1, "PP1")]);
  await assert.rejects(() => startNewTermForActiveClasses(mock.prisma, input, "START"));
  assert.equal(mock.calls.length, 0);
});
test("conflicts block every class in the final transaction", async () => {
  const conflict = existing({ endDate: date("2026-09-10") });
  const mock = makeClient([active(1, "PP1"), active(2, "PP2", [conflict])]);
  await assert.rejects(() => startNewTermForActiveClasses(mock.prisma, input, "START TERM 3"));
  assert.equal(mock.calls.length, 0);
});
