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
        const { name, password, role } = req.body;
        // ✅ Normalize email to lowercase
        const email = req.body.email?.toLowerCase();
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }
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
        // ✅ Normalize email to lowercase
        const email = req.body.email?.toLowerCase();
        const { password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required",
            });
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        // 🛡️ BLOCK ARCHIVED ACCOUNTS
        if (user.isArchived) {
            return res.status(403).json({
                message: "Account is archived. Contact administrator.",
            });
        }
        // 🛡️ BLOCK DEACTIVATED ACCOUNTS
        if (!user.isActive) {
            return res.status(403).json({
                message: "Account is deactivated.",
            });
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
            return res.status(400).json({
                message: "All fields are required.",
            });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        const isValid = await (0, password_1.verifyPassword)(currentPassword, user.password);
        if (!isValid) {
            return res.status(400).json({
                message: "Current password is incorrect.",
            });
        }
        const hashedNewPassword = await (0, password_1.hashPassword)(newPassword);
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedNewPassword,
                mustChangePassword: false,
                updatedAt: new Date(),
            },
        });
        // ✅ Audit log entry
        await (0, auditLog_service_1.createAuditLog)({
            action: client_1.AuditAction.PASSWORD_CHANGED,
            entityType: "User",
            entityId: String(userId),
            actorUserId: String(userId),
            actorRole: userRole,
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
