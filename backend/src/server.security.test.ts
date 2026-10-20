import assert from "node:assert/strict";
import test from "node:test";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request: any = require("supertest");
import { app } from "./server";

test("legacy debug database endpoints are not reachable without authentication", async () => {
  const users = await request(app).get("/debug/users");
  const subjects = await request(app).get("/debug/subjects");

  assert.equal(users.status, 404);
  assert.equal(subjects.status, 404);
  assert.notEqual(users.headers["content-type"], "application/json; charset=utf-8");
  assert.notEqual(subjects.headers["content-type"], "application/json; charset=utf-8");
});
