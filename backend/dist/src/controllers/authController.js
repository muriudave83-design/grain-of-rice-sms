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
// ======================================================
// REGISTER USER
// ======================================================
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (role === "ADMIN") {
            return res.status(403).json({
                message: "Admin accounts cannot be created via public registration",
            });
        }
        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) {
            return res.status(400).json({ message: "Email already registered" });
        }
        const hashed = await (0, password_1.hashPassword)(password);
        const user = await prisma.user.create({
            data: { name, email, password: hashed, role },
        });
        res.status(201).json({
            message: "User registered successfully",
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
        res.status(500).json({ message: "Server error", error: err.message });
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
                message: "Empty request body — is Content-Type application/json?",
            });
        }
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required",
            });
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        const valid = await (0, password_1.verifyPassword)(password, user.password);
        if (!valid) {
            return res.status(400).json({ message: "Invalid email or password" });
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
        const passwordMatches = await (0, password_1.verifyPassword)(currentPassword, user.password);
        if (!passwordMatches) {
            return res.status(401).json({
                message: "Current password is incorrect",
            });
        }
        const hashedNewPassword = await (0, password_1.hashPassword)(newPassword);
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedNewPassword,
                mustChangePassword: false,
            },
        });
        // ✅ FIXED: Use Prisma Enum
        await (0, auditLog_service_1.createAuditLog)({
            action: client_1.AuditAction.PASSWORD_CHANGED,
            entityType: "User",
            entityId: String(userId),
            actorUserId: String(userId),
            actorRole: userRole,
        });
        return res.json({
            message: "Password changed successfully",
        });
    }
    catch (err) {
        console.error("🔥 CHANGE PASSWORD ERROR:", err);
        return res.status(500).json({
            message: "Server error",
            error: err.message,
        });
    }
};
exports.changePassword = changePassword;
