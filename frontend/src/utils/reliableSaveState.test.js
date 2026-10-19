import assert from "node:assert/strict";
import test from "node:test";
import {
  acceptAuthoritativeValue,
  beginConfirmedOverwrite,
  beginSave,
  editSaveField,
  failSave,
  finishSave,
  hasUnresolvedSaves,
  mayLeaveWithUnresolved,
  SAVE_STATUS,
} from "./reliableSaveState.js";

test("draft, saving, confirmed saved, failed, conflict, and retry lifecycle", () => {
  const draft = editSaveField(null, 20, "30");
  assert.equal(draft.status, SAVE_STATUS.UNSAVED);
  const saving = beginSave(draft, 20);
  assert.equal(saving.status, SAVE_STATUS.SAVING);
  const failed = failSave(saving, saving.sequence, "offline");
  assert.equal(failed.status, SAVE_STATUS.FAILED);
  assert.equal(failed.draftValue, "30");
  const retry = beginSave(failed, 20);
  const saved = finishSave(retry, retry.sequence, 30);
  assert.equal(saved.status, SAVE_STATUS.SAVED);
  assert.equal(saved.serverValue, 30);
  const conflictSaving = beginSave(editSaveField(saved, 30, "40"), 30);
  const conflict = failSave(conflictSaving, conflictSaving.sequence, "stale", true, 35);
  assert.equal(conflict.status, SAVE_STATUS.CONFLICT);
  assert.equal(conflict.draftValue, "40");
  assert.equal(conflict.serverValue, 30);
  assert.equal(conflict.authoritativeValue, 35);
  assert.equal(beginSave(conflict, conflict.serverValue).serverValue, 30);

  const accepted = acceptAuthoritativeValue(conflict, conflict.authoritativeValue);
  assert.equal(accepted.status, SAVE_STATUS.SAVED);
  assert.equal(accepted.draftValue, "35");

  const overwrite = beginConfirmedOverwrite(conflict, conflict.authoritativeValue);
  assert.equal(overwrite.status, SAVE_STATUS.SAVING);
  assert.equal(overwrite.serverValue, 35);
  assert.equal(overwrite.draftValue, "40");
});

test("ordinary conflict retry cannot adopt the authoritative token", () => {
  const saving = beginSave(editSaveField(null, 20, "30"), 20);
  const conflict = failSave(saving, saving.sequence, "stale", true, 25);
  const ordinaryRetry = beginSave(conflict, conflict.serverValue);
  assert.equal(ordinaryRetry.serverValue, 20);
  assert.equal(ordinaryRetry.draftValue, "30");
});

test("late responses cannot replace a newer draft", () => {
  const first = beginSave(editSaveField(null, 10, "20"), 10);
  const newerDraft = editSaveField(first, 10, "45");
  assert.equal(finishSave(newerDraft, first.sequence, 20), newerDraft);
  assert.equal(failSave(newerDraft, first.sequence, "late"), newerDraft);
});

test("navigation requires confirmation for every unresolved state", () => {
  for (const status of [SAVE_STATUS.UNSAVED, SAVE_STATUS.SAVING, SAVE_STATUS.FAILED, SAVE_STATUS.CONFLICT]) {
    const fields = { one: { status } };
    assert.equal(hasUnresolvedSaves(fields), true);
    assert.equal(mayLeaveWithUnresolved(fields, () => false), false);
    assert.equal(mayLeaveWithUnresolved(fields, () => true), true);
  }
  assert.equal(mayLeaveWithUnresolved({ one: { status: SAVE_STATUS.SAVED } }, () => false), true);
});
