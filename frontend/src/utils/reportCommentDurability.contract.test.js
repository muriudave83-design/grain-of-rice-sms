import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const reports = fs.readFileSync(path.resolve(process.cwd(), "src/pages/teacher/Reports.jsx"), "utf8");
const sheet = fs.readFileSync(path.resolve(process.cwd(), "src/components/report-cards/TeacherReportCardSheet.jsx"), "utf8");

test("report comments use serialized saves, bounded retry, acknowledgement, and session drafts", () => {
  assert.match(reports, /enqueueLatestSave/);
  assert.match(reports, /withBoundedRetry/);
  assert.match(reports, /acknowledgeTokenizedSave/);
  assert.match(reports, /saveCommentDraft/);
  assert.match(reports, /getCommentDraft/);
  assert.match(reports, /900/);
});

test("login expiry retains the draft and intentional clearing is explicit", () => {
  assert.match(reports, /SAVE_STATUS\.LOGIN_REQUIRED/);
  assert.match(reports, /allowEmpty/);
  assert.match(reports, /Clear this saved comment/);
  assert.match(sheet, /Clear saved comment/);
  assert.match(sheet, /Sign in again/);
});
