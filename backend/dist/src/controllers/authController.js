"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.loginUser = exports.registerUser = void 0;
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auditLog_service_1 = require("../services/auditLog.service");
const password_1 = require("../utils/password");
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
// 🔥 DEFAULT PASSWORD (ADMIN-CONTROLLED)
const DEFAULT_PASSWORD = "password123";
// ======================================================
// REGISTER USER
// ======================================================
const registerUser = async (req, res) => {
    try {
        const { name, role } = req.body;
        const email = req.body.email?.toLowerCase()?.trim();
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }
        if (role === "ADMIN") {
            return res.status(403).json({
                message: "Admin accounts cannot be created via public registration",
            });
        }
        const exists = await prisma.user.findUnique({
            where: { email },
        });
        if (exists) {
            return res.status(400).json({
                message: "Email already registered",
            });
        }
        const hashedPassword = await (0, password_1.hashPassword)(DEFAULT_PASSWORD);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                isActive: true,
                isArchived: false,
                mustChangePassword: true,
            },
        });
        res.status(201).json({
            message: "User registered successfully",
            defaultPassword: DEFAULT_PASSWORD,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (err) {
        console.error("🔥 REGISTER ERROR:", err);
        res.status(500).json({
            message: "Server error",
            error: err.message,
        });
    }
};
exports.registerUser = registerUser;
// ======================================================
// LOGIN USER
// ======================================================
const loginUser = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                message: "Empty request body — ensure Content-Type is application/json",
            });
        }
        const email = req.body.email?.toLowerCase()?.trim();
        const { password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required",
            });
        }
        const user = await prisma.user.findUnique({
            where: { email },
        });
        // ✅ BLOCK INVALID OR ARCHIVED USERS
        if (!user || user.isArchived) {
            return res.status(401).json({
                message: "Invalid credentials",
            });
        }
        if (user.mustChangePassword) {
            return res.json({
                requirePasswordChange: true,
                userId: user.id,
            });
        }
        // 🛡️ BLOCK DEACTIVATED ACCOUNTS
        if (!user.isActive) {
            return res.status(403).json({
                message: "Account is deactivated.",
            });
        }
        const validPassword = await (0, password_1.verifyPassword)(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                message: "Invalid credentials",
            });
        }
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role,
        }, JWT_SECRET, { expiresIn: "1h" });
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("access_token", token, {
            httpOnly: true,
            sameSite: isProduction ? "none" : "lax",
            secure: isProduction,
            path: "/",
            maxAge: 60 * 60 * 1000,
        });
        // ✅ CLEAN USER OBJECT
        const { password: _, ...safeUser } = user;
        // ✅ FINAL RESPONSE (PURE USER)
        return res.json({
            token,
            mustChangePassword: user.mustChangePassword,
            user: safeUser,
        });
    }
    catch (err) {
        console.error("🔥 LOGIN ERROR:", err);
        res.status(500).json({
            message: "Server error",
            error: err.message,
        });
    }
};
exports.loginUser = loginUser;
// ======================================================
// CHANGE PASSWORD
// ======================================================
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, userId } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Current password and new password are required.",
            });
        }
        // ✅ USE userId FROM BODY (TEMP FLOW FIX)
        let targetUserId = userId;
        // ✅ FALLBACK TO AUTH USER (NORMAL FLOW)
        if (!targetUserId && req.user) {
            targetUserId = req.user.id;
        }
        if (!targetUserId) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }
        // ✅ FIX: ensure ID is a number
        const numericUserId = Number(targetUserId);
        if (isNaN(numericUserId)) {
            return res.status(400).json({
                message: "Invalid user ID",
            });
        }
        const user = await prisma.user.findUnique({
            where: { id: numericUserId },
        });
        if (!user) {
            return res.status(404).json({
                message: "User not found.",
            });
        }
        const isValid = await (0, password_1.verifyPassword)(currentPassword, user.password);
        if (!isValid) {
            return res.status(400).json({
                message: "Current password is incorrect.",
            });
        }
        const hashedNewPassword = await (0, password_1.hashPassword)(newPassword);
        await prisma.user.update({
            where: { id: numericUserId }, // ✅ FIXED HERE TOO
            data: {
                password: hashedNewPassword,
                mustChangePassword: false,
                updatedAt: new Date(),
            },
        });
        await (0, auditLog_service_1.createAuditLog)({
            action: client_1.AuditAction.PASSWORD_CHANGED,
            entityType: "User",
            entityId: String(numericUserId),
            actorUserId: String(numericUserId),
            actorRole: user.role,
        });
        return res.json({
            message: "Password updated successfully.",
        });
    }
    catch (err) {
        console.error("🔥 CHANGE PASSWORD ERROR:", err);
        return res.status(500).json({
            message: "Server error.",
            error: err.message,
        });
    }
};
exports.changePassword = changePassword;
