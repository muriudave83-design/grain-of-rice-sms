import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { displaySubjectComment, PRINT_MODE, reportsForMode } from "./reportCardPresentation.js";

const reports = [
  { studentId: 1, subjects: [{ teacherSubjectId: 10, comment: "English comment" }] },
  { studentId: 2, subjects: [{ teacherSubjectId: 10, comment: "Other student" }] },
];

test("batch and selected modes return the intended students", () => {
  assert.deepEqual(reportsForMode(reports, null, PRINT_MODE.ALL), reports);
  assert.deepEqual(reportsForMode(reports, 1, PRINT_MODE.SELECTED), [reports[0]]);
  assert.deepEqual(reportsForMode(reports, null, PRINT_MODE.SELECTED), []);
});

test("missing subject comments use a safe placeholder", () => {
  assert.equal(displaySubjectComment("English comment"), "English comment");
  assert.equal(displaySubjectComment(""), "—");
  assert.equal(displaySubjectComment(null), "—");
});

test("print structure has page boundaries and excludes controls", () => {
  const css = fs.readFileSync(new URL("../index.css", import.meta.url), "utf8");
  const component = fs.readFileSync(new URL("../pages/teacher/Reports.jsx", import.meta.url), "utf8");
  assert.match(css, /\.print-card[\s\S]*break-after:\s*page/);
  assert.match(css, /\.print-card:last-child[\s\S]*break-after:\s*auto/);
  assert.match(css, /\.print-hidden[\s\S]*display:\s*none/);
  assert.match(component, /Subject[\s\S]*Score[\s\S]*Grade[\s\S]*Teacher Comment/);
  assert.match(component, /Print Selected Student/);
  assert.match(component, /Print All Report Cards/);
});
