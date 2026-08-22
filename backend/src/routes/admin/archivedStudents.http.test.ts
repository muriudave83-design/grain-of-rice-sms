import assert from "node:assert/strict";
import "dotenv/config";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request: any = require("supertest");
import router from "./admin.students.routes";
import { prisma } from "../../prisma/client";

const app = express(); app.use(express.json()); app.use("/api/admin", router);
const roles = ["ATTENDANCE_OFFICER", "TEACHER", "PARENT", "STUDENT"] as const;
const paths = ["/api/admin/archived/students", "/api/admin/archived/students/999999", "/api/admin/archived/students/999999/history/attendance"];
const token = (id: number, role: string) => jwt.sign({ id, email: `${role}@test.local`, role }, process.env.JWT_SECRET || "dev_secret");

test("archive HTTP endpoints enforce ADMIN role matrix and authentication", async () => {
  const userFind = prisma.user.findUnique.bind(prisma.user);
  (prisma.user as any).findUnique = async ({ where }: any) => ({ id: where.id, email: "fixture@test.local", role: where.id === 1 ? "ADMIN" : roles[where.id - 2] });
  try {
    for (const path of paths) {
      assert.equal((await request(app).get(path)).status, 401);
      for (let index = 0; index < roles.length; index++) assert.equal((await request(app).get(path).set("Authorization", `Bearer ${token(index + 2, roles[index])}`)).status, 403);
    }
  } finally { (prisma.user as any).findUnique = userFind; }
});

test("restore HTTP endpoint rejects unauthenticated and non-ADMIN roles before mutation", async () => {
  const userFind = prisma.user.findUnique.bind(prisma.user);
  (prisma.user as any).findUnique = async ({ where }: any) => ({ id: where.id, email: "fixture@test.local", role: where.id === 1 ? "ADMIN" : "TEACHER" });
  try {
    assert.equal((await request(app).put("/api/admin/students/999999/restore").send({ classId: 1 })).status, 401);
    assert.equal((await request(app).put("/api/admin/students/999999/restore").set("Authorization", `Bearer ${token(2, "TEACHER")}`).send({ classId: 1 })).status, 403);
  } finally { (prisma.user as any).findUnique = userFind; }
});

test("ADMIN reaches list, detail, history, and safe nonexistent restore handlers", async () => {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true, email: true } });
  assert.ok(admin, "ADMIN fixture must exist");
  const adminToken = jwt.sign({ id: admin.id, email: admin.email, role: "ADMIN" }, process.env.JWT_SECRET || "dev_secret");
  assert.equal((await request(app).get("/api/admin/archived/students?page=1&pageSize=2").set("Authorization", `Bearer ${adminToken}`)).status, 200);
  const detail = await request(app).get("/api/admin/archived/students/204").set("Authorization", `Bearer ${adminToken}`);
  assert.equal(detail.status, 200); assert.equal(detail.body.admissionNo, "0007"); assert.equal(detail.body.classEnrollments[0].classNameSnapshot, "TEST CLASS"); assert.equal(detail.body.classEnrollments[0].source, "PHASE_1_BACKFILL"); assert.equal(detail.body.classEnrollments[0].startedAt, null); assert.equal(detail.body.classEnrollments[0].endedAt, null);
  assert.equal((await request(app).get("/api/admin/archived/students/204/history/attendance?page=1&pageSize=2").set("Authorization", `Bearer ${adminToken}`)).status, 200);
  assert.equal((await request(app).put("/api/admin/students/999999/restore").set("Authorization", `Bearer ${adminToken}`).send({ classId: 1 })).status, 404);
});
