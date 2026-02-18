import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { createAuditLog } from "../services/auditLog.service";
import { hashPassword, verifyPassword } from "../utils/password";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// ======================================================
// REGISTER USER
// ======================================================
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
      if (role === "ADMIN") {
        return res.status(403).json({
          message: "Admin accounts cannot be created via public registration",
        });
      }

    console.log("📥 Register request:", req.body);

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      console.log("❌ Email already exists:", email);
      return res.status(400).json({ message: "Email already registered" });
    }

    // ✅ USE CENTRAL PASSWORD HELPER
    const hashed = await hashPassword(password);

    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
    });

    console.log("✅ Registered new user ID:", user.id);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error("🔥 REGISTER ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ======================================================
// LOGIN USER
// ======================================================
export const loginUser = async (req: Request, res: Response) => {
  try {
    console.log("\n======================================");
    console.log("📡 RAW HEADERS:", req.headers);
    console.log("📥 Login Body:", req.body);
    console.log("======================================");

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message: "Empty request body — is Content-Type application/json?",
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
        received: req.body,
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    console.log("🔍 Prisma returned user:", user ? "FOUND" : "NOT FOUND");

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    console.log("👤 USER ROLE FROM DB:", user.role);
    console.log("👤 USER ID:", user.id);

    // ✅ USE CENTRAL PASSWORD HELPER
    console.log("🔐 Comparing password hash...");
    const valid = await verifyPassword(password, user.password);
    console.log("🔐 Password valid:", valid);

    if (!valid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("access_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 1000,
    });

    res.json({
      message: "Login successful",
      token,
      mustChangePassword: user.mustChangePassword,
      role: user.role,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error("🔥 LOGIN ERROR:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// ======================================================
// CHANGE PASSWORD
// ======================================================
export const changePassword = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ USE CENTRAL PASSWORD HELPER
    const passwordMatches = await verifyPassword(
      currentPassword,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        mustChangePassword: false,
      },
    });

    await createAuditLog({
      action: "PASSWORD_CHANGED",
      entityType: "User",
      entityId: String(userId),
      actorUserId: String(userId),
      actorRole: userRole,
    });

    return res.json({
      message: "Password changed successfully",
    });
  } catch (err: any) {
    console.error("🔥 CHANGE PASSWORD ERROR:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
