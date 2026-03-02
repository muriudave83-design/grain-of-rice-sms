import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { prisma } from "../prisma/client";

/* ------------------------------------------------------------------ */
/* TEMP stub — Phase 9 not implemented yet                              */
/* Notifications must never block domain logic                          */
/* ------------------------------------------------------------------ */
const NotificationService = {
  emitEvent: (..._args: any[]) => {},
};

interface LoginInput {
  email: string;
  password: string;
}

export async function login({ email, password }: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  // ✅ Track last login timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || "dev_secret",
    { expiresIn: "7d" }
  );

  try {
    NotificationService.emitEvent({
      name: "user.login",
      occurredAt: new Date(),

      actor: {
        userId: user.id,
        role: user.role,
      },

      entity: {
        type: "User",
        id: user.id,
      },

      metadata: {
        method: "password",
      },
    });
  } catch {}

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
}