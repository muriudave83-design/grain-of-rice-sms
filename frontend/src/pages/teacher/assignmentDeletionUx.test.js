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

test("published assignment has a distinct destructive workflow and exact phrase", () => {
  assert.match(source, /deletionStatus === "PUBLISHED"/);
  assert.match(source, /Delete Published Assignment Data/);
  assert.match(source, /DELETE PUBLISHED ASSIGNMENT/);
  assert.match(source, /Already-issued Report Cards and Transcripts will remain unchanged/);
  assert.doesNotMatch(source, /Published â€” cannot delete/);
});

test("menu is accessible and closes outside or with Escape", () => {
  assert.match(source, /aria-haspopup="menu"/);
  assert.match(source, /role="menu"/);
  assert.match(source, /role="menuitem"/);
  assert.match(source, /document\.addEventListener\("pointerdown", closeOutside\)/);
  assert.match(source, /event\.key === "Escape"/);
});

test("successful deletion removes only the Assignment and its local Score keys", () => {
  assert.match(source, /assignments\.filter\(\(assignment\) => assignment\.id !== assignmentId\)/);
  assert.match(source, /endsWith\(`-\$\{assignmentId\}`\)/);
});
