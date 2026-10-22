import assert from "node:assert/strict";
import test from "node:test";
import { withBoundedRetry } from "./boundedRetry.js";
import { clearUserCommentDrafts, getCommentDraft, removeCommentDraft, saveCommentDraft } from "./commentDraftStore.js";

const memoryStorage = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
};
const identity = { studentId: 1, teacherSubjectId: 2, subjectId: 3, termId: 4 };

test("draft survives reload but remains scoped to user, student, subject, teacher assignment, and term", () => {
  const storage = memoryStorage();
  saveCommentDraft(31, identity, { value: "Veronica draft", serverValue: "", serverToken: null }, storage, 1000);
  assert.equal(getCommentDraft(31, identity, storage, 2000).value, "Veronica draft");
  assert.equal(getCommentDraft(30, identity, storage, 2000), null);
  assert.equal(getCommentDraft(31, { ...identity, termId: 5 }, storage, 2000), null);
  removeCommentDraft(31, identity, storage);
  assert.equal(getCommentDraft(31, identity, storage, 2000), null);
});

test("expired drafts are not restored and explicit logout clears the user's drafts", () => {
  const storage = memoryStorage();
  saveCommentDraft(31, identity, { value: "private", serverValue: "" }, storage, 0);
  assert.equal(getCommentDraft(31, identity, storage, 13 * 60 * 60 * 1000), null);
  saveCommentDraft(31, identity, { value: "private", serverValue: "" }, storage, Date.now());
  clearUserCommentDrafts(31, storage);
  assert.equal(getCommentDraft(31, identity, storage), null);
});

test("transient failure retries with bounded backoff and stops after acknowledgement", async () => {
  let attempts = 0;
  const waits = [];
  const result = await withBoundedRetry(async () => {
    attempts += 1;
    if (attempts < 3) throw Object.assign(new Error("pool timeout"), { response: { status: 503 } });
    return "saved";
  }, (error) => error.response?.status === 503, [10, 20, 30], async (ms) => waits.push(ms));
  assert.equal(result, "saved");
  assert.equal(attempts, 3);
  assert.deepEqual(waits, [10, 20]);
});

test("401 is never retried", async () => {
  let attempts = 0;
  await assert.rejects(() => withBoundedRetry(async () => {
    attempts += 1;
    throw Object.assign(new Error("login"), { response: { status: 401 } });
  }, (error) => error.response?.status === 503, [1, 1], async () => {}), /login/);
  assert.equal(attempts, 1);
});
