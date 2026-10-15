import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./SidebarNav.jsx", import.meta.url), "utf8");
const academics = source.match(/\{\/\* ACADEMICS \*\/\}([\s\S]*?)\{\/\* FINANCE \*\/\}/)?.[1] || "";

test("Academics navigation includes the administrator gradebook route", () => {
  assert.match(academics, /<NavLink to=\{path\("grades"\)\} className=\{linkClass\}>\s*📊 Grades\s*<\/NavLink>/);
  assert.equal((source.match(/path\("grades"\)/g) || []).length, 1);
});
