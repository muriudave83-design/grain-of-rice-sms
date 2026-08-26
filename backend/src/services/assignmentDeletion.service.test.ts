import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { calculateFinalGradeForStudent } from "../controllers/teacher.controller";
import { deleteOwnedAssignment, PUBLISHED_DELETE_CONFIRMATION, SCORE_DELETE_CONFIRMATION } from "./assignmentDeletion.service";

const assignment = (overrides: any = {}) => ({
  id: 10, title: "Assignment A", termId: 3,
  teacherSubject: { subjectId: 7, classId: 6 }, term: { classId: 6 },
  _count: { scores: 0 }, ...overrides,
});

function clientFor(options: { assignment?: any; grade?: any; failAssignmentDelete?: boolean } = {}) {
  const calls: string[] = [];
  const state = { scores: [1, 2], assignments: [10, 11], grades: [90], students: [1, 2] };
  const client = {
    calls,
    state,
    $transaction: async (callback: any, config: any) => {
      calls.push(`isolation:${config.isolationLevel}`);
      const draft = structuredClone(state);
      const tx = {
        assignment: {
          findFirst: async (args: any) => { calls.push(`find:${JSON.stringify(args.where)}`); return options.assignment === undefined ? assignment() : options.assignment; },
          delete: async ({ where }: any) => {
            calls.push(`assignment.delete:${where.id}`);
            if (options.failAssignmentDelete) throw new Error("simulated delete failure");
            draft.assignments = draft.assignments.filter((id) => id !== where.id);
          },
        },
        grade: {
          count: async (args: any) => { calls.push(`grade.count:${JSON.stringify(args.where)}`); return options.grade ? 2 : 0; },
          deleteMany: async (args: any) => { calls.push(`grade.deleteMany:${JSON.stringify(args.where)}`); draft.grades = []; return { count: 2 }; },
        },
        score: { deleteMany: async ({ where }: any) => { calls.push(`score.deleteMany:${where.assignmentId}`); draft.scores = []; } },
      };
      const result = await callback(tx);
      Object.assign(state, draft);
      return result;
    },
  };
  return client;
}

test("teacher deletes own zero-score assignment transactionally without destructive phrase", async () => {
  const client = clientFor();
  assert.deepEqual(await deleteOwnedAssignment(client as any, 30, 10), { status: "DELETED", scoreCount: 0, title: "Assignment A", invalidatedGradeCount: 0 });
  assert.ok(client.calls[0].includes("Serializable"));
  assert.deepEqual(client.calls.slice(-2), ["score.deleteMany:10", "assignment.delete:10"]);
});

test("wrong teacher or guessed assignment ID cannot delete", async () => {
  const client = clientFor({ assignment: null });
  assert.deepEqual(await deleteOwnedAssignment(client as any, 99, 10), { status: "NOT_FOUND" });
  assert.match(client.calls[1], /"teacherId":99/);
  assert.doesNotMatch(client.calls.join("\n"), /deleteMany|assignment\.delete/);
});

test("scored assignment requires the exact explicit confirmation", async () => {
  const client = clientFor({ assignment: assignment({ _count: { scores: 15 } }) });
  assert.deepEqual(await deleteOwnedAssignment(client as any, 30, 10, "delete"), {
    status: "CONFIRMATION_REQUIRED", scoreCount: 15, title: "Assignment A",
  });
  assert.doesNotMatch(client.calls.join("\n"), /deleteMany|assignment\.delete/);
});

test("confirmed deletion removes only target Scores then target Assignment", async () => {
  const client = clientFor({ assignment: assignment({ _count: { scores: 15 } }) });
  assert.equal((await deleteOwnedAssignment(client as any, 30, 10, SCORE_DELETE_CONFIRMATION)).status, "DELETED");
  assert.deepEqual(client.calls.slice(-2), ["score.deleteMany:10", "assignment.delete:10"]);
  assert.deepEqual(client.state.assignments, [11]);
  assert.deepEqual(client.state.grades, [90]);
  assert.deepEqual(client.state.students, [1, 2]);
});

test("transaction failure rolls back Score deletion", async () => {
  const client = clientFor({ assignment: assignment({ _count: { scores: 2 } }), failAssignmentDelete: true });
  await assert.rejects(() => deleteOwnedAssignment(client as any, 30, 10, SCORE_DELETE_CONFIRMATION), /simulated delete failure/);
  assert.deepEqual(client.state.scores, [1, 2]);
  assert.deepEqual(client.state.assignments, [10, 11]);
});

test("published Grade requires its distinct exact confirmation regardless of Assignment lock state", async () => {
  const client = clientFor({ assignment: assignment({ isLocked: true, _count: { scores: 15 } }), grade: { id: 90 } });
  assert.deepEqual(await deleteOwnedAssignment(client as any, 30, 10, SCORE_DELETE_CONFIRMATION), {
    status: "PUBLISHED_CONFIRMATION_REQUIRED", scoreCount: 15, publishedGradeCount: 2, title: "Assignment A",
  });
  assert.doesNotMatch(client.calls.join("\n"), /deleteMany|assignment\.delete/);
  const gradeQuery = client.calls.find((call) => call.startsWith("grade.count:")) || "";
  assert.match(gradeQuery, /"subjectId":7/); assert.match(gradeQuery, /"termId":3/); assert.match(gradeQuery, /"classId":6/);
});

test("confirmed published deletion invalidates only subject, class, and Term Grades after deleting target data", async () => {
  const client = clientFor({ assignment: assignment({ _count: { scores: 15 } }), grade: { id: 90 } });
  const result = await deleteOwnedAssignment(client as any, 30, 10, PUBLISHED_DELETE_CONFIRMATION);
  assert.equal(result.status, "DELETED");
  assert.equal(result.status === "DELETED" && result.invalidatedGradeCount, 2);
  assert.deepEqual(client.calls.slice(-3).map((call) => call.split(":")[0]), ["score.deleteMany", "assignment.delete", "grade.deleteMany"]);
  const invalidation = client.calls.find((call) => call.startsWith("grade.deleteMany:")) || "";
  assert.match(invalidation, /"subjectId":7/);
  assert.match(invalidation, /"termId":3/);
  assert.match(invalidation, /"classId":6/);
});

test("cross-class Term mismatch blocks deletion", async () => {
  const client = clientFor({ assignment: assignment({ term: { classId: 8 } }) });
  assert.deepEqual(await deleteOwnedAssignment(client as any, 30, 10), { status: "TERM_MISMATCH" });
  assert.doesNotMatch(client.calls.join("\n"), /deleteMany|assignment\.delete/);
});

test("remaining assignments alone drive recalculated average and completeness", () => {
  const assignmentA = { maxPoints: 100, weight: 1, scores: [{ studentId: 1, score: 50 }] };
  const assignmentB = { maxPoints: 100, weight: 1, scores: [{ studentId: 1, score: 80 }] };
  assert.equal(calculateFinalGradeForStudent(1, [assignmentA, assignmentB]), 65);
  assert.equal(calculateFinalGradeForStudent(1, [assignmentB]), 80);
  assert.equal(calculateFinalGradeForStudent(2, [assignmentB]), null);
  const students = [{ name: "Zara" }, { name: "Alice" }];
  assert.deepEqual(students.sort((a, b) => a.name.localeCompare(b.name)).map((item) => item.name), ["Alice", "Zara"]);
});

test("published lifecycle still locks assignments and blocks edit and unlock", () => {
  const controller = fs.readFileSync(path.resolve(process.cwd(), "src/controllers/teacher.controller.ts"), "utf8");
  const routes = fs.readFileSync(path.resolve(process.cwd(), "src/routes/teacher.routes.ts"), "utf8");
  assert.match(controller, /data: \{ isLocked: true \}/);
  assert.match(controller, /Published final-grade assignments cannot be edited/);
  assert.match(routes, /Published final-grade assignments cannot be unlocked/);
  assert.match(routes, /subjectId: owned\.teacherSubject\.subjectId/);
  assert.match(routes, /termId: owned\.termId/);
});

test("published deletion never rewrites issued ReportCard or Transcript snapshots", () => {
  const service = fs.readFileSync(path.resolve(process.cwd(), "src/services/assignmentDeletion.service.ts"), "utf8");
  assert.doesNotMatch(service, /reportCard|reportCardSubjectEntry|transcript|transcriptEntry/i);
  assert.match(service, /grade\.deleteMany/);
});
