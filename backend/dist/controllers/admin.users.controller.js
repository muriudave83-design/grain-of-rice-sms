"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsers = void 0;
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
 * Optional query:
 *   ?role=TEACHER | PARENT | STUDENT | ADMIN
 */
const listUsers = async (req, res) => {
    try {
        const roleQuery = req.query.role;
        console.log("ROLE FILTER:", roleQuery);
        // Validate role against Prisma enum
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
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(users);
    }
    catch (err) {
        console.error("Failed to list users:", err);
        res.status(500).json({ message: "Failed to fetch users" });
    }
};
exports.listUsers = listUsers;
/**
 * INTERNAL HELPER
 * Centralized user creation logic for ADMIN actions
 */
async function createUserInternal(req, res, role) {
    const { name, email, tempPassword } = req.body;
    if (!name || !email || !tempPassword) {
        return res.status(400).json({ message: "Missing required fields" });
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
            email,
            password: hashedPassword,
            role,
            mustChangePassword: true,
        },
    });
    await (0, auditLog_service_1.createAuditLog)({
        action: "USER_CREATED",
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
/**
 * ADMIN: Create Teacher
 * POST /api/admin/users/teacher
 */
async function createTeacher(req, res) {
    return createUserInternal(req, res, "TEACHER");
}
/**
 * ADMIN: Create Parent
 * POST /api/admin/users/parent
 */
async function createParent(req, res) {
    return createUserInternal(req, res, "PARENT");
}
/**
 * ADMIN: Create Student
 * POST /api/admin/users/student
 */
async function createStudent(req, res) {
    return createUserInternal(req, res, "STUDENT");
}
