import assert from "node:assert/strict";
import test from "node:test";
import { setTeacherSubjectActive } from "./teacherSubjectLifecycle.service";

const baseAssignment = (isActive = true, overrides: any = {}) => ({
  id: 12,
  teacherId: 3,
  classId: 6,
  subjectId: 9,
  isActive,
  teacher: { id: 3, role: "TEACHER", isActive: true, isArchived: false },
  class: { id: 6, isArchived: false },
  subject: { id: 9, isArchived: false },
  ...overrides,
});

function lifecycleClient(initial: any) {
  let assignment = initial;
  const history = {
    assignments: [101], scores: [201], reportComments: [301], grades: [401],
    reportCards: [501], transcripts: [601],
  };
  let updateCount = 0;
  return {
    history,
    get assignment() { return assignment; },
    get updateCount() { return updateCount; },
    $transaction: async (callback: any) => callback({
      teacherSubject: {
        findUnique: async () => assignment,
        update: async ({ data }: any) => {
          updateCount += 1;
          assignment = { ...assignment, ...data };
          return assignment;
        },
      },
    }),
  };
}

test("deactivation changes only TeacherSubject.isActive and preserves all history", async () => {
  const client = lifecycleClient(baseAssignment());
  const before = structuredClone(client.history);
  assert.equal((await setTeacherSubjectActive(client, 12, false)).status, "UPDATED");
  assert.equal(client.assignment.isActive, false);
  assert.deepEqual(client.history, before);
  assert.equal(client.updateCount, 1);
});

test("deactivating an inactive assignment is idempotent", async () => {
  const client = lifecycleClient(baseAssignment(false));
  assert.equal((await setTeacherSubjectActive(client, 12, false)).status, "UNCHANGED");
  assert.equal(client.updateCount, 0);
});

test("reactivation uses the same row and is idempotent once active", async () => {
  const client = lifecycleClient(baseAssignment(false));
  assert.equal((await setTeacherSubjectActive(client, 12, true)).status, "UPDATED");
  assert.equal(client.assignment.id, 12);
  assert.equal((await setTeacherSubjectActive(client, 12, true)).status, "UNCHANGED");
  assert.equal(client.updateCount, 1);
});

test("missing assignment is reported without a write", async () => {
  const client = lifecycleClient(null);
  assert.equal((await setTeacherSubjectActive(client, 999, false)).status, "NOT_FOUND");
  assert.equal(client.updateCount, 0);
});

for (const [label, assignment] of [
  ["archived teacher", baseAssignment(false, { teacher: { id: 3, role: "TEACHER", isActive: true, isArchived: true } })],
  ["inactive teacher", baseAssignment(false, { teacher: { id: 3, role: "TEACHER", isActive: false, isArchived: false } })],
  ["non-teacher user", baseAssignment(false, { teacher: { id: 3, role: "ADMIN", isActive: true, isArchived: false } })],
  ["archived class", baseAssignment(false, { class: { id: 6, isArchived: true } })],
  ["archived subject", baseAssignment(false, { subject: { id: 9, isArchived: true } })],
] as const) {
  test(`reactivation rejects ${label}`, async () => {
    const client = lifecycleClient(assignment);
    assert.equal((await setTeacherSubjectActive(client, 12, true)).status, "INVALID_STRUCTURE");
    assert.equal(client.updateCount, 0);
  });
}
