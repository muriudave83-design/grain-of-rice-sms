"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("../prisma/client");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const admin_users_controller_1 = require("../controllers/admin.users.controller"); // ✅ added
const router = (0, express_1.Router)();
/**
 * ✅ GET /api/admin/stats
 * Real dashboard numbers
 */
router.get("/stats", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (_req, res) => {
    try {
        const students = await client_1.prisma.student.count();
        const teachers = await client_1.prisma.user.count({
            where: { role: "TEACHER" },
        });
        const parents = await client_1.prisma.user.count({
            where: { role: "PARENT" },
        });
        const classes = await client_1.prisma.class.count();
        return res.json({
            students,
            teachers,
            parents,
            classes,
        });
    }
    catch (error) {
        console.error("Failed to load admin stats:", error);
        return res.status(500).json({ message: "Failed to load stats" });
    }
});
/**
 * ✅ GET /api/admin/users
 * Uses controller (supports ?role= filter)
 */
router.get("/users", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), admin_users_controller_1.listUsers // ✅ fixed — now using controller
);
/**
 * Shared admin user creation helper
 * (TEACHER / PARENT)
 */
async function createUser({ name, email, password, role, }) {
    if (!name || !email || !password) {
        throw new Error("All fields are required");
    }
    const existing = await client_1.prisma.user.findUnique({ where: { email } });
    if (existing) {
        throw new Error("User already exists");
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    return client_1.prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role,
            mustChangePassword: true,
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
        },
    });
}
/**
 * POST /api/admin/users/teacher
 */
router.post("/users/teacher", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const user = await createUser({
            ...req.body,
            role: "TEACHER",
        });
        return res.status(201).json(user);
    }
    catch (error) {
        console.error("Failed to create teacher:", error);
        return res.status(400).json({ message: error.message });
    }
});
/**
 * POST /api/admin/users/parent
 */
router.post("/users/parent", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const user = await createUser({
            ...req.body,
            role: "PARENT",
        });
        return res.status(201).json(user);
    }
    catch (error) {
        console.error("Failed to create parent:", error);
        return res.status(400).json({ message: error.message });
    }
});
/**
 * POST /api/admin/users/student
 */
router.post("/users/student", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const existing = await client_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ message: "Email already in use" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await client_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "STUDENT",
                mustChangePassword: true,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });
        return res.status(201).json(user);
    }
    catch (error) {
        console.error("Failed to create student:", error);
        return res.status(400).json({ message: error.message });
    }
});
/**
 * POST /api/admin/students/:studentId/link-user
 */
router.post("/students/:studentId/link-user", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    const studentId = Number(req.params.studentId);
    const { userId } = req.body;
    if (Number.isNaN(studentId) || !userId) {
        return res.status(400).json({ message: "Invalid input" });
    }
    const student = await client_1.prisma.student.findUnique({
        where: { id: studentId },
    });
    if (!student) {
        return res.status(404).json({ message: "Student not found" });
    }
    const user = await client_1.prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user || user.role !== "STUDENT") {
        return res
            .status(400)
            .json({ message: "User must exist and have STUDENT role" });
    }
    if (student.userId) {
        return res
            .status(409)
            .json({ message: "Student already linked to a user" });
    }
    const userAlreadyLinked = await client_1.prisma.student.findFirst({
        where: { userId },
    });
    if (userAlreadyLinked) {
        return res.status(409).json({
            message: "This user is already linked to another student",
        });
    }
    await client_1.prisma.student.update({
        where: { id: studentId },
        data: { userId: user.id },
    });
    return res.json({ message: "Student successfully linked to user" });
});
exports.default = router;
