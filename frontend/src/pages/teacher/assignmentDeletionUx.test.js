import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./GradebookDetail.jsx", import.meta.url), "utf8");

test("zero-score deletion uses a simple named confirmation", () => {
  assert.match(source, /window\.confirm\(`Delete assignment '\$\{assignment\.title\}'\?`\)/);
});

test("scored deletion requires the typed destructive phrase and sends it to backend", () => {
  assert.match(source, /This assignment contains/);
  assert.match(source, /DELETE ASSIGNMENT/);
  assert.match(source, /data: confirmation \? \{ confirmation \} : \{\}/);
});

test("published assignment deletion is disabled with an explanation", () => {
  assert.match(source, /deletionStatus === "PUBLISHED"/);
  assert.match(source, /Published final grades protect this assignment/);
  assert.match(source, /part of published final grades and cannot be deleted/);
});

test("successful deletion removes only the Assignment and its local Score keys", () => {
  assert.match(source, /assignments\.filter\(\(assignment\) => assignment\.id !== assignmentId\)/);
  assert.match(source, /endsWith\(`-\$\{assignmentId\}`\)/);
});
