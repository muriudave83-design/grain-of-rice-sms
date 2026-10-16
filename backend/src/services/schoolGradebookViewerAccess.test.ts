import assert from "node:assert/strict";
import test from "node:test";
import { Role } from "@prisma/client";
import { canViewSchoolGradebooks, schoolGradebookViewerEmails, schoolGradebookViewerIds } from "./schoolGradebookViewerAccess";

test("only configured active teacher identities receive school-wide viewing capability", () => {
  assert.deepEqual([...schoolGradebookViewerIds("12, 27, 41, invalid, -1")], [12, 27, 41]);
  assert.deepEqual([...schoolGradebookViewerEmails(" Martha@Example.org, rodgers@example.org ")], [
    "martha@example.org",
    "rodgers@example.org",
  ]);
  assert.equal(canViewSchoolGradebooks({ id: 12, role: Role.TEACHER }, "12,27,41"), true);
  assert.equal(canViewSchoolGradebooks({ id: 13, role: Role.TEACHER }, "12,27,41"), false);
  assert.equal(canViewSchoolGradebooks({ id: 12, role: Role.ADMIN }, "12,27,41"), false);
  assert.equal(
    canViewSchoolGradebooks(
      { id: 13, email: "COUNSELOR@grainofriceproject.org", role: Role.TEACHER },
      "",
      "counselor@grainofriceproject.org",
    ),
    true,
  );
  assert.equal(
    canViewSchoolGradebooks(
      { id: 13, email: "counselor@grainofriceproject.org", role: Role.ADMIN },
      "",
      "counselor@grainofriceproject.org",
    ),
    false,
  );
});
