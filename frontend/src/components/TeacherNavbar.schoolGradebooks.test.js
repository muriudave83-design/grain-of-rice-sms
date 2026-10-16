import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./TeacherNavbar.jsx", import.meta.url), "utf8");

test("teacher navigation shows school gradebooks only for the server-provided capability", () => {
  assert.match(source, /canViewSchoolGradebooks\s*=\s*JSON\.parse/);
  assert.match(source, /\{canViewSchoolGradebooks && \(/);
  assert.match(source, /to="\/teacher\/school-gradebooks"/);
});
