import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./Classes.jsx", import.meta.url), "utf8");

test("class deletion uses dependency preview and guarded with-data endpoint", () => {
  assert.match(source, /classes\/\$\{cls\.id\}\/delete-preview/);
  assert.match(source, /classes\/\$\{deleteClass\.id\}\/with-data/);
  assert.match(source, /deleteConfirmation !== deletePreview\?\.confirmationPhrase/);
  assert.doesNotMatch(source, /confirm\(`Delete/);
});

test("modal distinguishes blockers, deletable data and preserved master data", () => {
  assert.match(source, /Permanently Delete Class/);
  assert.match(source, /BLOCKERS/);
  assert.match(source, /WILL DELETE/);
  assert.match(source, /WILL PRESERVE/);
  assert.match(source, /Move .*student.*another class/);
});

test("archive confirmation explicitly preserves students and history", () => {
  assert.match(source, /students and historical academic records will be preserved/);
});
