import assert from "node:assert/strict";
import test from "node:test";
import { enqueueLatestSave } from "./latestSaveQueue.js";

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test("rapid edits are serialized and only the latest pending draft is saved", async () => {
  const queues = {};
  const gate = deferred();
  const saved = [];
  const worker = async (value) => {
    saved.push(value);
    if (value === "first") await gate.promise;
    return true;
  };

  const idle = enqueueLatestSave(queues, "comment", "first", worker);
  enqueueLatestSave(queues, "comment", "second", worker);
  enqueueLatestSave(queues, "comment", "latest", worker);
  assert.deepEqual(saved, ["first"]);
  gate.resolve();
  await idle;
  assert.deepEqual(saved, ["first", "latest"]);
});

test("a conflict stops pending saves instead of silently overwriting", async () => {
  const queues = {};
  const gate = deferred();
  const attempted = [];
  const worker = async (value) => {
    attempted.push(value);
    await gate.promise;
    return false;
  };

  const idle = enqueueLatestSave(queues, "comment", "stale", worker);
  enqueueLatestSave(queues, "comment", "newer draft", worker);
  gate.resolve();
  await idle;
  assert.deepEqual(attempted, ["stale"]);
});
