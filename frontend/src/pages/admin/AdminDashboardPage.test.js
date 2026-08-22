import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./AdminDashboardPage.jsx", import.meta.url), "utf8");

test("global metrics load independently and without termId", () => {
  assert.match(source, /fetchGlobalData/);
  for (const endpoint of ["/students", "/admin/users", "/admin/classes", "/fees"]) assert.ok(source.includes(`"${endpoint}"`));
  assert.doesNotMatch(source, /`\/fees\?termId=/);
});
test("partial global failures are isolated and discipline is independently term-scoped", () => {
  assert.match(source, /Promise\.allSettled/);
  assert.match(source, /`\/discipline\?termId=\$\{currentTermId\}`/);
  assert.match(source, /Select a term/);
  assert.match(source, /Not available/);
});
