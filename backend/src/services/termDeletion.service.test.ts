import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient, Role } from "@prisma/client";
import { requireRole } from "../middlewares/rolesMiddleware";
import { deleteTermData, getTermDeletePreview, termDeleteConfirmation } from "./termDeletion.service";

const deletableModels = [
  "score", "assessmentScore", "reportCardSubjectEntry", "transcriptEntry", "attendanceEntry",
  "assignment", "assessment", "grade", "reportCard", "reportComment", "transcript",
  "attendanceSession", "discipline", "term",
];

function makeClient(count = 1, failModel?: string) {
  const calls: Array<{ model: string; operation: string; args: any }> = [];
  const client: any = {};
  const countModels = ["assignment", "score", "assessment", "assessmentScore", "grade", "reportCard",
    "reportCardSubjectEntry", "reportComment", "transcript", "transcriptEntry", "attendanceSession",
    "attendanceEntry", "discipline"];
  for (const model of countModels) {
    client[model] = {
      count: async (args: any) => {
        calls.push({ model, operation: "count", args });
        return count;
      },
      deleteMany: async (args: any) => {
        calls.push({ model, operation: "deleteMany", args });
        if (model === failModel) throw new Error("forced failure");
        return { count };
      },
    };
  }
  client.term = {
    findUnique: async () => ({ id: 9, name: "Term 2", academicYear: "2026/2027", classId: 20, class: { name: "GRADE 6" } }),
    delete: async (args: any) => {
      calls.push({ model: "term", operation: "delete", args });
      if (failModel === "term") throw new Error("forced failure");
      return { id: 9 };
    },
  };
  client.$transaction = async (callback: (tx: any) => unknown) => {
    const checkpoint = calls.length;
    try { return await callback(client); }
    catch (error) { calls.splice(checkpoint); throw error; }
  };
  return { prisma: client as PrismaClient, calls };
}

async function deletedModels() {
  const mock = makeClient();
  await deleteTermData(mock.prisma, 9, "DELETE TERM 2");
  return { mock, models: mock.calls.filter((call) => call.operation.startsWith("delete")).map((call) => call.model) };
}

test("1. delete empty Term", async () => {
  const mock = makeClient(0);
  const result = await deleteTermData(mock.prisma, 9, "DELETE TERM 2");
  assert.equal(result.totalRelatedRecords, 0);
  assert.equal(mock.calls[mock.calls.length - 1]?.model, "term");
});
test("2. delete Term with Assignment and Score", async () => {
  const { models } = await deletedModels(); assert.ok(models.includes("score") && models.includes("assignment"));
});
test("3. delete Term with Assessment and AssessmentScore", async () => {
  const { models } = await deletedModels(); assert.ok(models.includes("assessmentScore") && models.includes("assessment"));
});
test("4. delete Term with Grade", async () => { assert.ok((await deletedModels()).models.includes("grade")); });
test("5. delete Term with ReportCard entries", async () => {
  const { models } = await deletedModels(); assert.ok(models.includes("reportCardSubjectEntry") && models.includes("reportCard"));
});
test("6. delete Term with Transcript entries", async () => {
  const { models } = await deletedModels(); assert.ok(models.includes("transcriptEntry") && models.includes("transcript"));
});
test("7. delete Term with AttendanceSession and Entry", async () => {
  const { models } = await deletedModels(); assert.ok(models.includes("attendanceEntry") && models.includes("attendanceSession"));
});
for (const [number, model] of [[8, "student"], [9, "user"], [10, "parent"], [11, "class"],
  [12, "subject"], [13, "teacherSubject"], [14, "classSubject"]] as const) {
  test(`${number}. preserve ${model}`, async () => {
    const { mock } = await deletedModels(); assert.equal(mock.calls.some((call) => call.model === model), false);
  });
}
test("15. preserve null-term attendance", async () => {
  const { mock } = await deletedModels();
  const deletion = mock.calls.find((call) => call.model === "attendanceSession" && call.operation === "deleteMany");
  assert.deepEqual(deletion?.args.where, { termId: 9 });
});
test("16. preserve unrelated Term", async () => {
  const { mock } = await deletedModels();
  assert.equal(JSON.stringify(mock.calls.filter((call) => call.operation.startsWith("delete"))).includes('"termId":10'), false);
});
test("17. preserve another Class's data", async () => {
  const { mock } = await deletedModels();
  assert.equal(mock.calls.filter((call) => call.operation.startsWith("delete")).some((call) => call.args?.where?.classId === 21), false);
});
test("18. transaction rollback on failure", async () => {
  const mock = makeClient(1, "grade");
  await assert.rejects(() => deleteTermData(mock.prisma, 9, "DELETE TERM 2"));
  assert.equal(mock.calls.some((call) => call.operation.startsWith("delete")), false);
});
test("19. non-Admin receives 403", () => {
  let status = 0;
  const response = {
    status(code: number) { status = code; return this; },
    json() { return this; },
  };
  const request = { user: { id: 3, role: Role.TEACHER } };
  requireRole([Role.ADMIN])(request as any, response as any, () => assert.fail("must not call next"));
  assert.equal(status, 403);
});
test("20. preview counts match the deletable model set", async () => {
  const mock = makeClient(1);
  const preview = await getTermDeletePreview(mock.prisma, 9);
  assert.equal(Object.keys(preview.willDelete).length, 13);
  assert.equal(preview.totalRelatedRecords, 13);
  const { models } = await deletedModels();
  assert.deepEqual(models, deletableModels);
});
test("confirmation phrase is deterministic", () => assert.equal(termDeleteConfirmation("Term 2"), "DELETE TERM 2"));
test("incorrect typed confirmation cannot start deletion", async () => {
  const mock = makeClient();
  await assert.rejects(
    () => deleteTermData(mock.prisma, 9, "DELETE"),
    (error: any) => error?.status === 400 && error?.message === "Type DELETE TERM 2 to confirm deletion",
  );
  assert.equal(mock.calls.some((call) => call.operation.startsWith("delete")), false);
});
