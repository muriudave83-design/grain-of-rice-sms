import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request: any = require("supertest");
import { Role } from "@prisma/client";
import { prisma } from "../prisma/client";
import { authenticate } from "./authMiddleware";

const secret = process.env.JWT_SECRET || "dev_secret";
const token = (id: number) => jwt.sign(
  { id, email: "staff@test.local", role: Role.TEACHER },
  secret,
);

const app = express();
app.get("/protected", authenticate, (req, res) => {
  res.status(200).json({ user: (req as any).user });
});

async function withUser(
  user: { id: number; email: string; role: Role; isActive: boolean; isArchived: boolean } | null,
  run: () => Promise<void>,
) {
  const findUnique = prisma.user.findUnique.bind(prisma.user);
  (prisma.user as any).findUnique = async () => user;
  try {
    await run();
  } finally {
    (prisma.user as any).findUnique = findUnique;
  }
}

test("active users retain access", async () => {
  await withUser(
    { id: 1, email: "staff@test.local", role: Role.TEACHER, isActive: true, isArchived: false },
    async () => {
      const response = await request(app)
        .get("/protected")
        .set("Authorization", `Bearer ${token(1)}`);

      assert.equal(response.status, 200);
      assert.deepEqual(response.body.user, {
        id: 1,
        email: "staff@test.local",
        role: Role.TEACHER,
      });
    },
  );
});

test("inactive users are rejected after token verification", async () => {
  await withUser(
    { id: 2, email: "staff@test.local", role: Role.TEACHER, isActive: false, isArchived: false },
    async () => {
      const response = await request(app)
        .get("/protected")
        .set("Authorization", `Bearer ${token(2)}`);

      assert.equal(response.status, 403);
      assert.deepEqual(response.body, { message: "Account is deactivated." });
    },
  );
});

test("archived users are rejected after token verification", async () => {
  await withUser(
    { id: 3, email: "staff@test.local", role: Role.TEACHER, isActive: true, isArchived: true },
    async () => {
      const response = await request(app)
        .get("/protected")
        .set("Authorization", `Bearer ${token(3)}`);

      assert.equal(response.status, 403);
      assert.deepEqual(response.body, { message: "Account is deactivated." });
    },
  );
});

test("tokens for missing users are rejected", async () => {
  await withUser(null, async () => {
    const response = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token(4)}`);

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { message: "Invalid user" });
  });
});

test("invalid tokens are rejected", async () => {
  let lookupAttempted = false;
  const findUnique = prisma.user.findUnique.bind(prisma.user);
  (prisma.user as any).findUnique = async () => {
    lookupAttempted = true;
    return null;
  };

  try {
    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer not-a-valid-token");

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { message: "Invalid or expired token" });
    assert.equal(lookupAttempted, false);
  } finally {
    (prisma.user as any).findUnique = findUnique;
  }
});
