import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { AssignmentMaximumPointsError, updateOwnedAssignmentMaximumPoints } from "./assignmentMaximumPoints.service";

function fixture(overrides: any = {}) {
  const scores = overrides.scores ?? [{ id: 1, studentId: 7, assignmentId: 10, score: 18 }];
  const assignment = overrides.assignment === null ? null : {
    id: 10, maxPoints: 20, isLocked: false, termId: 3, gradeContributionReviewedAt: null,
    term: { isLocked: false, isActive: true }, teacherSubject: { classId: 4, subjectId: 5 },
    combinedAssignmentChild: null, ...overrides.assignment,
  };
  let savedMax = assignment?.maxPoints;
  const calls: any = { updateData: null };
  const tx: any = {
    assignment: {
      findFirst: async () => assignment,
      updateMany: async (args: any) => {
        calls.updateData = args.data;
        if (overrides.race || savedMax !== args.where.maxPoints) return { count: 0 };
        savedMax = args.data.maxPoints;
        return { count: 1 };
      },
      findUniqueOrThrow: async () => ({ ...assignment, maxPoints: savedMax, scores }),
    },
    score: { aggregate: async () => ({ _max: { score: scores.length ? Math.max(...scores.map((item: any) => item.score)) : null } }) },
    gradeContributionScope: {
      findUnique: async () => overrides.scope ?? null,
      update: async (args: any) => { calls.scopeUpdate = args; return args; },
    },
    grade: { findFirst: async () => overrides.grade ?? null },
    reportCard: { findFirst: async () => overrides.reportCard ?? null },
    transcript: { findFirst: async () => overrides.transcript ?? null },
  };
  return { client: { $transaction: async (work: any) => work(tx) }, calls, scores };
}

const change = (client: any, input: any = {}) => updateOwnedAssignmentMaximumPoints(client, {
  assignmentId: 10, teacherId: 2, maxPoints: 25, expectedMaxPoints: 20, ...input,
});

test("updates an unlocked assignment without scores", async () => {
  const f = fixture({ scores: [] });
  assert.equal((await change(f.client)).maxPoints, 25);
});

test("updates with scores while preserving every score and student association", async () => {
  const f = fixture();
  const before = structuredClone(f.scores);
  const updated = await change(f.client);
  assert.deepEqual(updated.scores, before);
  assert.equal(f.calls.updateData.maxPoints, 25);
});

test("rejects a maximum below the highest recorded score", async () => {
  const f = fixture({ scores: [{ studentId: 7, score: 19 }, { studentId: 8, score: 12 }] });
  await assert.rejects(() => change(f.client, { maxPoints: 18 }), /highest recorded score \(19\)/);
});

for (const value of [0, -1, "not-a-number", Infinity, 10.001]) {
  test(`rejects invalid maximum points ${String(value)}`, async () => {
    const f = fixture({ scores: [] });
    await assert.rejects(() => change(f.client, { maxPoints: value }), AssignmentMaximumPointsError);
  });
}

test("blocks an unauthorized teacher without revealing the assignment", async () => {
  const f = fixture({ assignment: null });
  await assert.rejects(() => change(f.client), (error: any) => error.status === 404);
});

test("blocks locked assignments and locked terms", async () => {
  const locked = fixture({ assignment: { isLocked: true } });
  await assert.rejects(() => change(locked.client), /Assignment is locked/);
  const term = fixture({ assignment: { term: { isLocked: true, isActive: true } } });
  await assert.rejects(() => change(term.client), /Term is locked/);
});

test("blocks activated or administratively reviewed assignments", async () => {
  const active = fixture({ scope: { id: 9, mode: "ACTIVE" } });
  await assert.rejects(() => change(active.client), /administrative approval/);
  const reviewed = fixture({ assignment: { gradeContributionReviewedAt: new Date() } });
  await assert.rejects(() => change(reviewed.client), /administrative approval/);
});

test("protects published grades, generated report cards, and transcripts", async () => {
  for (const protectedData of [{ grade: { id: 1 } }, { reportCard: { id: 2, status: "PUBLISHED" } }, { transcript: { id: 3 } }]) {
    const f = fixture(protectedData);
    await assert.rejects(() => change(f.client), /administrative reopening process/);
  }
});

test("invalidates a pending contribution review without touching scores", async () => {
  const f = fixture({ scope: { id: 9, mode: "REVIEWING", revision: 4 } });
  await change(f.client);
  assert.equal(f.calls.updateData.gradeContributionStatus, "UNREVIEWED");
  assert.deepEqual(f.calls.scopeUpdate.data, { revision: { increment: 1 }, mode: "REVIEWING", activatedAt: null });
});

test("detects simultaneous maximum-point changes", async () => {
  const stale = fixture({ assignment: { maxPoints: 30 } });
  await assert.rejects(() => change(stale.client), (error: any) => error.status === 409 && error.current.maxPoints === 30);
  const race = fixture({ race: true });
  await assert.rejects(() => change(race.client), /changed or was locked/);
});

test("generic assignment update rejects maxPoints and only the dedicated route exposes regular editing", () => {
  const controller = readFileSync(path.resolve(process.cwd(), "src/controllers/teacher.controller.ts"), "utf8");
  const routes = readFileSync(path.resolve(process.cwd(), "src/routes/teacher.routes.ts"), "utf8");
  assert.match(controller, /updateAssignment[\s\S]*hasOwnProperty\.call\(req\.body, "maxPoints"\)[\s\S]*Use the maximum-points endpoint/);
  assert.match(routes, /router\.patch\("\/assignment\/:id\/max-points", updateAssignmentMaximumPoints\)/);
  assert.doesNotMatch(routes, /router\.(?:put|post)\("\/assignment\/:id\/max-points"/);
});
