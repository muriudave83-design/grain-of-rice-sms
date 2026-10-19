import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const normal = fs.readFileSync(new URL("../pages/teacher/GradebookDetail.jsx", import.meta.url), "utf8");
const combined = fs.readFileSync(new URL("../pages/teacher/CombinedGradebook.jsx", import.meta.url), "utf8");
const reports = fs.readFileSync(new URL("../pages/teacher/Reports.jsx", import.meta.url), "utf8");
const reportSheet = fs.readFileSync(new URL("../components/report-cards/TeacherReportCardSheet.jsx", import.meta.url), "utf8");
const guard = fs.readFileSync(new URL("./useUnsavedChangesGuard.js", import.meta.url), "utf8");

test("normal score cells expose durable save states, preserve failures, and offer retry", () => {
  assert.match(normal, /unsaved/i);
  assert.match(normal, /saving/i);
  assert.match(normal, /saved/i);
  assert.match(normal, /failed/i);
  assert.match(normal, /retry/i);
});

test("combined score cells use the same durable save-state and retry contract", () => {
  assert.match(combined, /unsaved/i);
  assert.match(combined, /saving/i);
  assert.match(combined, /saved/i);
  assert.match(combined, /failed/i);
  assert.match(combined, /retry/i);
});

test("score writes carry the last server-confirmed value for conflict detection", () => {
  assert.match(normal, /expectedScore/);
  assert.match(combined, /expectedScore/);
});

test("pending or failed score edits protect browser navigation and term switching", () => {
  assert.match(normal, /useUnsavedChangesGuard/);
  assert.match(normal, /pending|failed/i);
  assert.match(combined, /useUnsavedChangesGuard/);
  assert.match(combined, /pending|failed/i);
});

test("comments expose save states and retry without discarding the draft", () => {
  assert.match(reports, /unsaved/i);
  assert.match(reports, /saving/i);
  assert.match(reports, /saved/i);
  assert.match(reports, /failed/i);
  assert.match(reports, /retry/i);
  assert.match(reports, /expectedUpdatedAt/);
});

test("conflicts require an explicit use-saved or confirmed-overwrite decision", () => {
  for (const source of [normal, combined, reportSheet]) {
    assert.match(source, /Use saved value/);
    assert.match(source, /Overwrite with my value/);
  }
  for (const source of [normal, combined, reports]) assert.match(source, /globalThis\.confirm\("Overwrite the newer saved/);
  assert.match(reports, /onCommentUseSaved/);
  assert.match(reports, /onCommentOverwrite/);
  assert.doesNotMatch(combined, /status === "Conflict"[^\n]*>Retry</);
});

test("router and browser navigation share one unresolved-save guard", () => {
  assert.match(guard, /useBlocker/);
  assert.match(guard, /beforeunload/);
  assert.match(normal, /useUnsavedChangesGuard/);
  assert.match(combined, /useUnsavedChangesGuard/);
  assert.match(reports, /useUnsavedChangesGuard/);
});

test("printing is guarded while comment saves are pending or failed", () => {
  assert.match(reports, /pending|failed/i);
  assert.match(reports, /window\.print\(\)/);
  assert.match(reports, /useUnsavedChangesGuard/);
});
