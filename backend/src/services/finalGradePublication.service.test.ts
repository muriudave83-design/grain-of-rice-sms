import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { FinalGradePublicationError, publishFinalGradesAtomically } from "./finalGradePublication.service";

function legacyTransaction() {
  const calls: any = { grades: [], locked: null, raw: 0 };
  const tx = {
    term: { findFirst: async () => ({ id: 4 }) },
    teacherSubject: { findMany: async () => [{
      id: 9, teacherId: 2, classId: 3, subjectId: 5,
      subject: { id: 5, name: "Mathematics" },
      assignments: [{ id: 10, title: "Test", weight: 1, maxPoints: 100, scores: [{ studentId: 20, score: 0 }] }],
    }] },
    student: { findMany: async () => [{ id: 20, firstName: "Zero", lastName: "Score" }] },
    gradeContributionScope: { findMany: async (): Promise<any[]> => [] },
    assignment: { updateMany: async (args: any) => { calls.locked = args; return { count: 1 }; } },
    grade: { upsert: async (args: any) => { calls.grades.push(args); return args.create; } },
    $queryRaw: async () => { calls.raw++; return [{ id: 10 }]; },
  };
  return { tx, calls };
}

test("publication performs authoritative reads and writes in one Serializable transaction", async () => {
  const { tx, calls } = legacyTransaction();
  let options: any;
  const client = { $transaction: async (fn: any, received: any) => { options = received; return fn(tx); } };
  const result = await publishFinalGradesAtomically(client, { classId: 3, termId: 4, teacherId: 2 });
  assert.equal(options.isolationLevel, Prisma.TransactionIsolationLevel.Serializable);
  assert.deepEqual(result, { publishedGrades: 1 });
  assert.equal(calls.grades[0].create.total, 0);
  assert.equal(calls.raw, 1);
  assert.deepEqual(calls.locked.data, { isLocked: true });
});

test("publication stores total earned over total possible rather than averaging percentages", async () => {
  const { tx, calls } = legacyTransaction();
  tx.teacherSubject.findMany = async () => [{
    id: 9, teacherId: 2, classId: 3, subjectId: 5,
    subject: { id: 5, name: "Mathematics" },
    assignments: [
      { id: 10, title: "A", weight: 1, maxPoints: 20, scores: [{ studentId: 20, score: 18 }] },
      { id: 11, title: "B", weight: 1, maxPoints: 50, scores: [{ studentId: 20, score: 30 }] },
      { id: 12, title: "C", weight: 1, maxPoints: 10, scores: [{ studentId: 20, score: 8 }] },
    ],
  }];
  const client = { $transaction: async (fn: any) => fn(tx) };
  await publishFinalGradesAtomically(client, { classId: 3, termId: 4, teacherId: 2 });
  assert.equal(calls.grades[0].create.total, 70);
  assert.equal(calls.grades[0].create.average, 0.7);
});

test("publication retries bounded PostgreSQL serialization conflicts", async () => {
  const { tx } = legacyTransaction();
  let attempts = 0;
  const conflict = () => new Prisma.PrismaClientKnownRequestError("serialization", { code: "P2034", clientVersion: "6.19.0" });
  const client = { $transaction: async (fn: any) => {
    attempts++;
    if (attempts < 3) throw conflict();
    return fn(tx);
  } };
  await publishFinalGradesAtomically(client, { classId: 3, termId: 4, teacherId: 2 });
  assert.equal(attempts, 3);
});

test("publication returns a refreshable conflict after retry exhaustion", async () => {
  const conflict = () => new Prisma.PrismaClientKnownRequestError("serialization", { code: "P2034", clientVersion: "6.19.0" });
  const client = { $transaction: async () => { throw conflict(); } };
  await assert.rejects(
    () => publishFinalGradesAtomically(client, { classId: 3, termId: 4, teacherId: 2 }),
    (error: any) => error instanceof FinalGradePublicationError && error.status === 409,
  );
});

test("reviewing scopes block publication without writing grades", async () => {
  const { tx, calls } = legacyTransaction();
  tx.gradeContributionScope.findMany = async () => [{ id: 1, subjectId: 5, mode: "REVIEWING", revision: 2 }];
  const client = { $transaction: async (fn: any) => fn(tx) };
  await assert.rejects(
    () => publishFinalGradesAtomically(client, { classId: 3, termId: 4, teacherId: 2 }),
    (error: any) => error.status === 409 && error.details.missing[0].assignment.includes("activated"),
  );
  assert.equal(calls.grades.length, 0);
});
