import assert from "node:assert/strict";
import test from "node:test";
import { Role } from "@prisma/client";
import { canViewSchoolGradebooks, schoolGradebookViewerIds } from "./schoolGradebookViewerAccess";

test("only configured active teacher identities receive school-wide viewing capability", () => {
  assert.deepEqual([...schoolGradebookViewerIds("12, 27, 41, invalid, -1")], [12, 27, 41]);
  assert.equal(canViewSchoolGradebooks({ id: 12, role: Role.TEACHER }, "12,27,41"), true);
  assert.equal(canViewSchoolGradebooks({ id: 13, role: Role.TEACHER }, "12,27,41"), false);
  assert.equal(canViewSchoolGradebooks({ id: 12, role: Role.ADMIN }, "12,27,41"), false);
});
