"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetUserPassword = exports.archiveUser = exports.listUsers = void 0;
exports.createTeacher = createTeacher;
exports.createParent = createParent;
exports.createStudent = createStudent;
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("../prisma/client");
const auditLog_service_1 = require("../services/auditLog.service");
const client_2 = require("@prisma/client");
/**
 * ADMIN: List Users
 * GET /api/admin/users
 */
const listUsers = async (req, res) => {
    try {
        const roleQuery = req.query.role;
        const role = roleQuery && Object.values(client_2.Role).includes(roleQuery)
            ? roleQuery
            : undefined;
        const users = await client_1.prisma.user.findMany({
            where: role ? { role } : undefined,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                lastLoginAt: true,
                mustChangePassword: true,
                isActive: true,
                isArchived: true,
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json(users);
    }
    catch (err) {
        console.error("Failed to list users:", err);
        return res.status(500).json({ message: "Failed to fetch users" });
    }
};
exports.listUsers = listUsers;
/**
 * 🗂️ ADMIN: Archive User (Soft Delete)
 * PATCH /api/admin/users/:id/archive
 */
const archiveUser = async (req, res) => {
    try {
        const userId = Number(req.params.id);
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const currentAdminId = req.user.id;
        if (!userId) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        if (userId === currentAdminId) {
            return res.status(400).json({
                message: "You cannot archive your own account.",
            });
        }
        const user = await client_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        if (user.role === "ADMIN") {
            const adminCount = await client_1.prisma.user.count({
                where: {
                    role: "ADMIN",
                    isArchived: false,
                },
            });
            if (adminCount <= 1) {
                return res.status(400).json({
                    message: "Cannot archive the last active ADMIN.",
                });
            }
        }
        await client_1.prisma.user.update({
            where: { id: userId },
            data: {
                isArchived: true,
                isActive: false,
            },
        });
        await (0, auditLog_service_1.createAuditLog)({
            action: client_2.AuditAction.USER_UPDATED,
            entityType: "User",
            entityId: String(user.id),
            actorUserId: String(currentAdminId),
            actorRole: req.user.role,
            metadata: {
                archived: true,
            },
        });
        return res.json({ message: "User archived successfully." });
    }
    catch (error) {
        console.error("Failed to archive user:", error);
        return res.status(500).json({
            message: "Failed to archive user.",
        });
    }
};
exports.archiveUser = archiveUser;
/**
 * 🔐 ADMIN: Reset User Password
 * PATCH /api/admin/users/:id/reset-password
 */
const resetUserPassword = async (req, res) => {
    try {
        const userId = Number(req.params.id);
        if (!userId) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const user = await client_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.id === req.user.id) {
            return res.status(400).json({
                message: "You cannot reset your own password.",
            });
        }
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt_1.default.hash(tempPassword, 10);
        await client_1.prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                mustChangePassword: true,
            },
        });
        await (0, auditLog_service_1.createAuditLog)({
            action: client_2.AuditAction.USER_PASSWORD_RESET,
            entityType: "User",
            entityId: String(user.id),
            actorUserId: String(req.user.id),
            actorRole: req.user.role,
            metadata: {
                email: user.email,
            },
        });
        return res.json({
            message: "Password reset successful",
            temporaryPassword: tempPassword,
        });
    }
    catch (error) {
        console.error("Failed to reset password:", error);
        return res.status(500).json({
            message: "Failed to reset password",
        });
    }
};
exports.resetUserPassword = resetUserPassword;
/**
 * INTERNAL HELPER
 */
async function createUserInternal(req, res, role) {
    try {
        const { name, tempPassword } = req.body;
        // ✅ Normalize email to lowercase
        const email = req.body.email?.toLowerCase();
        if (!name || !email || !tempPassword) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const existing = await client_1.prisma.user.findUnique({
            where: { email },
        });
        if (existing) {
            return res.status(409).json({ message: "User already exists" });
        }
        const hashedPassword = await bcrypt_1.default.hash(tempPassword, 10);
        const user = await client_1.prisma.user.create({
            data: {
                name,
                email, // ✅ normalized email stored
                password: hashedPassword,
                role,
                mustChangePassword: true,
            },
        });
        await (0, auditLog_service_1.createAuditLog)({
            action: client_2.AuditAction.USER_CREATED,
            entityType: "User",
            entityId: String(user.id),
            actorUserId: String(req.user.id),
            actorRole: req.user.role,
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
    catch (error) {
        console.error("Failed to create user:", error);
        return res.status(500).json({ message: "Failed to create user" });
    }
}
/**
 * ADMIN: Create Teacher
 */
async function createTeacher(req, res) {
    return createUserInternal(req, res, "TEACHER");
}
/**
 * ADMIN: Create Parent
 */
async function createParent(req, res) {
    return createUserInternal(req, res, "PARENT");
}
/**
 * ADMIN: Create Student
 */
async function createStudent(req, res) {
    return createUserInternal(req, res, "STUDENT");
}
