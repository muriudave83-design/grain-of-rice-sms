import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request: any = require("supertest");
import router from "./schoolGradebookViewer.routes";
import { prisma } from "../prisma/client";

const app = express();
app.use(express.json());
app.use("/api/gradebook-viewer", router);

const token = (id: number, role: string) => jwt.sign({ id, email: `${role.toLowerCase()}@test.local`, role }, process.env.JWT_SECRET || "dev_secret");

test("configured coaches can read classes while ordinary teachers and non-teachers are denied", async () => {
  const priorIds = process.env.SCHOOL_GRADEBOOK_VIEWER_USER_IDS;
  process.env.SCHOOL_GRADEBOOK_VIEWER_USER_IDS = "12,27,41";
  const userFind = prisma.user.findUnique.bind(prisma.user);
  const classFind = prisma.class.findMany.bind(prisma.class);
  (prisma.user as any).findUnique = async ({ where }: any) => ({
    id: where.id,
    email: "fixture@test.local",
    role: where.id === 60 ? "PARENT" : where.id === 70 ? "ADMIN" : "TEACHER",
    isActive: true,
    isArchived: false,
  });
  (prisma.class as any).findMany = async () => [{ id: 3, name: "Grade 3", level: "3" }];
  try {
    assert.equal((await request(app).get("/api/gradebook-viewer/classes")).status, 401);
    for (const id of [12, 27, 41]) {
      assert.equal((await request(app).get("/api/gradebook-viewer/classes").set("Authorization", `Bearer ${token(id, "TEACHER")}`)).status, 200);
    }
    assert.equal((await request(app).get("/api/gradebook-viewer/classes").set("Authorization", `Bearer ${token(13, "TEACHER")}`)).status, 403);
    assert.equal((await request(app).get("/api/gradebook-viewer/classes").set("Authorization", `Bearer ${token(60, "PARENT")}`)).status, 403);
    assert.equal((await request(app).get("/api/gradebook-viewer/classes").set("Authorization", `Bearer ${token(70, "ADMIN")}`)).status, 403);
  } finally {
    (prisma.user as any).findUnique = userFind;
    (prisma.class as any).findMany = classFind;
    if (priorIds === undefined) delete process.env.SCHOOL_GRADEBOOK_VIEWER_USER_IDS;
    else process.env.SCHOOL_GRADEBOOK_VIEWER_USER_IDS = priorIds;
  }
});

test("deactivated and archived configured teachers are rejected before gradebook access", async () => {
  const priorIds = process.env.SCHOOL_GRADEBOOK_VIEWER_USER_IDS;
  process.env.SCHOOL_GRADEBOOK_VIEWER_USER_IDS = "12,27";
  const userFind = prisma.user.findUnique.bind(prisma.user);
  (prisma.user as any).findUnique = async ({ where }: any) => ({
    id: where.id,
    email: "fixture@test.local",
    role: "TEACHER",
    isActive: where.id !== 12,
    isArchived: where.id === 27,
  });
  try {
    assert.equal((await request(app).get("/api/gradebook-viewer/classes").set("Authorization", `Bearer ${token(12, "TEACHER")}`)).status, 403);
    assert.equal((await request(app).get("/api/gradebook-viewer/classes").set("Authorization", `Bearer ${token(27, "TEACHER")}`)).status, 403);
  } finally {
    (prisma.user as any).findUnique = userFind;
    if (priorIds === undefined) delete process.env.SCHOOL_GRADEBOOK_VIEWER_USER_IDS;
    else process.env.SCHOOL_GRADEBOOK_VIEWER_USER_IDS = priorIds;
  }
});

test("viewer API exposes no grade-writing method", async () => {
  const priorIds = process.env.SCHOOL_GRADEBOOK_VIEWER_USER_IDS;
  process.env.SCHOOL_GRADEBOOK_VIEWER_USER_IDS = "12";
  const userFind = prisma.user.findUnique.bind(prisma.user);
  (prisma.user as any).findUnique = async () => ({ id: 12, email: "coach@test.local", role: "TEACHER", isActive: true, isArchived: false });
  try {
    for (const method of ["post", "put", "patch", "delete"]) {
      assert.equal((await request(app)[method]("/api/gradebook-viewer/classes").set("Authorization", `Bearer ${token(12, "TEACHER")}`)).status, 404);
    }
  } finally {
    (prisma.user as any).findUnique = userFind;
    if (priorIds === undefined) delete process.env.SCHOOL_GRADEBOOK_VIEWER_USER_IDS;
    else process.env.SCHOOL_GRADEBOOK_VIEWER_USER_IDS = priorIds;
  }
});
