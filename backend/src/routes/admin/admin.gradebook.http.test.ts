import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request: any = require("supertest");
import router from "./admin.gradebook.routes";
import { prisma } from "../../prisma/client";

const app = express();
app.use(express.json());
app.use("/api/admin", router);

const token = (id: number, role: string) => jwt.sign({ id, email: `${role.toLowerCase()}@test.local`, role }, process.env.JWT_SECRET || "dev_secret");

test("administrator gradebook requires authentication and rejects teacher and parent roles", async () => {
  const userFind = prisma.user.findUnique.bind(prisma.user);
  (prisma.user as any).findUnique = async ({ where }: any) => ({ id: where.id, email: "fixture@test.local", role: where.id === 2 ? "TEACHER" : "PARENT", isActive: true, isArchived: false });
  try {
    assert.equal((await request(app).get("/api/admin/gradebook/classes")).status, 401);
    assert.equal((await request(app).get("/api/admin/gradebook/classes").set("Authorization", `Bearer ${token(2, "TEACHER")}`)).status, 403);
    assert.equal((await request(app).get("/api/admin/gradebook/classes").set("Authorization", `Bearer ${token(3, "PARENT")}`)).status, 403);
  } finally {
    (prisma.user as any).findUnique = userFind;
  }
});

test("active administrator can access the read-only class endpoint", async () => {
  const userFind = prisma.user.findUnique.bind(prisma.user);
  const classFind = prisma.class.findMany.bind(prisma.class);
  (prisma.user as any).findUnique = async () => ({ id: 1, email: "admin@test.local", role: "ADMIN", isActive: true, isArchived: false });
  (prisma.class as any).findMany = async ({ where }: any) => {
    assert.deepEqual(where, { isArchived: false });
    return [{ id: 3, name: "Grade 3", level: "3" }];
  };
  try {
    const response = await request(app).get("/api/admin/gradebook/classes").set("Authorization", `Bearer ${token(1, "ADMIN")}`);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, [{ id: 3, name: "Grade 3", level: "3" }]);
  } finally {
    (prisma.user as any).findUnique = userFind;
    (prisma.class as any).findMany = classFind;
  }
});
