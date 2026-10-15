import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./Grades.jsx", import.meta.url), "utf8");

test("administrator gradebook uses only read APIs and renders no score editing controls", () => {
  assert.match(source, /apiClient\.get\("\/admin\/gradebook\/classes", \{ signal: controller\.signal \}\)/);
  assert.match(source, /apiClient\.get\(`\/admin\/gradebook\/teacher-subjects\/\$\{teacherSubjectId\}`/);
  assert.doesNotMatch(source, /apiClient\.(post|put|patch|delete)/);
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
