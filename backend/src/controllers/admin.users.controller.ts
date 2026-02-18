import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../prisma/client";
import { createAuditLog } from "../services/auditLog.service";
import { Role } from "@prisma/client";

/**
 * ADMIN: List Users
 * GET /api/admin/users
 * Optional query:
 *   ?role=TEACHER | PARENT | STUDENT | ADMIN
 */
export const listUsers = async (req: Request, res: Response) => {
  try {
    const roleQuery = req.query.role as string | undefined;

    console.log("ROLE FILTER:", roleQuery);

    // Validate role against Prisma enum
    const role: Role | undefined =
      roleQuery && Object.values(Role).includes(roleQuery as Role)
        ? (roleQuery as Role)
        : undefined;

    const users = await prisma.user.findMany({
      where: role ? { role } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(users);
  } catch (err) {
    console.error("Failed to list users:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

/**
 * INTERNAL HELPER
 * Centralized user creation logic for ADMIN actions
 */
async function createUserInternal(
  req: Request,
  res: Response,
  role: "TEACHER" | "PARENT" | "STUDENT"
) {
  const { name, email, tempPassword } = req.body;

  if (!name || !email || !tempPassword) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return res.status(409).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      mustChangePassword: true,
    },
  });

  await createAuditLog({
    action: "USER_CREATED",
    entityType: "User",
    entityId: String(user.id),
    actorUserId: String(req.user!.id),
    actorRole: req.user!.role,
    metadata: {
      role,
      email,
    },
  });

  return res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
}

/**
 * ADMIN: Create Teacher
 * POST /api/admin/users/teacher
 */
export async function createTeacher(req: Request, res: Response) {
  return createUserInternal(req, res, "TEACHER");
}

/**
 * ADMIN: Create Parent
 * POST /api/admin/users/parent
 */
export async function createParent(req: Request, res: Response) {
  return createUserInternal(req, res, "PARENT");
}

/**
 * ADMIN: Create Student
 * POST /api/admin/users/student
 */
export async function createStudent(req: Request, res: Response) {
  return createUserInternal(req, res, "STUDENT");
}
