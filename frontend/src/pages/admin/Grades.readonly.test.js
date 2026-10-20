import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./Grades.jsx", import.meta.url), "utf8");

test("administrator gradebook keeps marks read-only while exposing only explicit contribution review writes", () => {
  assert.match(source, /apiBase = "\/admin\/gradebook"/);
  assert.match(source, /apiClient\.get\(`\$\{apiBase\}\/classes`, \{ signal: controller\.signal \}\)/);
  assert.match(source, /apiClient\.get\(`\$\{apiBase\}\/teacher-subjects\/\$\{teacherSubjectId\}`/);
  assert.match(source, /apiClient\.patch\(`\$\{apiBase\}\/assignments\/\$\{assignment\.id\}\/contribution`/);
  assert.match(source, /apiClient\.post\(`\$\{apiBase\}\/contribution-scopes\/activate`/);
  assert.doesNotMatch(source, /apiClient\.(put|delete)/);
  assert.doesNotMatch(source, /apiClient\.(post|patch)\([^\n]*(score|scores)/i);
  assert.doesNotMatch(source, /type=["']number["']/);
});

test("administrator gradebook identifies exact records and labels historical assignments", () => {
  assert.match(source, /TeacherSubject #\{gradebook\.teacherSubject\.id\}/);
  assert.match(source, /Assignment #\{assignment\.id\}/);
  assert.match(source, /Historical assignment/);
  assert.match(source, /No legacy assignments exist/);
  assert.match(source, /assignments do not have any scores yet/);
});

test("superseded class and gradebook requests cannot overwrite the current selection", () => {
  assert.ok((source.match(/new AbortController\(\)/g) || []).length >= 3);
  assert.ok((source.match(/signal: controller\.signal/g) || []).length >= 3);
  assert.ok((source.match(/current = false/g) || []).length >= 3);
  assert.match(source, /optionsRequestId\.current === requestId\) setOptions/);
  assert.match(source, /gradebookRequestId\.current === requestId\) setGradebook/);
  assert.match(source, /optionsRequestId\.current \+= 1; gradebookRequestId\.current \+= 1; setClassId/);
  assert.match(source, /gradebookRequestId\.current \+= 1; setTeacherSubjectId/);
  assert.match(source, /requestError\.code !== "ERR_CANCELED"/);
  assert.match(source, /gradebookRequestId\.current === requestId\) setGradebookLoading\(false\)/);
  assert.match(source, /optionsRequestId\.current === requestId\) setOptionsLoading\(false\)/);
});

test("selection changes clear dependent selections and stale display state", () => {
  assert.match(source, /setSubjectId\(""\);\s*setTeacherSubjectId\(""\);\s*setTermId\(""\);\s*setGradebook\(null\)/);
  assert.match(source, /setSubjectId\(event\.target\.value\); setTeacherSubjectId\(""\); setTermId\(""\); setGradebook\(null\)/);
  assert.match(source, /setTeacherSubjectId\(event\.target\.value\); setGradebook\(null\)/);
  assert.match(source, /setTermId\(event\.target\.value\); setGradebook\(null\)/);
});
