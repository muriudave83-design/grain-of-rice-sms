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
const admin_users_controller_1 = require("../controllers/admin.users.controller");
const router = (0, express_1.Router)();

/**
 * Utility: Generate temporary password
 */
function generateTempPassword(length = 10) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

/**
 * ✅ GET /api/admin/stats (UPDATED)
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

        // 🔥 NEW: AVG ATTENDANCE CALCULATION
        const totalAttendance = await client_1.prisma.attendance.count();

        const presentCount = await client_1.prisma.attendance.count({
            where: { status: "PRESENT" },
        });

        let avgAttendance = 0;

        if (totalAttendance > 0) {
            avgAttendance = Math.round((presentCount / totalAttendance) * 100);
        }

        return res.json({
            students,
            teachers,
            parents,
            classes,
            avgAttendance, // ✅ NEW FIELD
        });
    }
    catch (error) {
        console.error("Failed to load admin stats:", error);
        return res.status(500).json({ message: "Failed to load stats" });
    }
});

/**
 * ✅ GET /api/admin/users
 */
router.get("/users", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), admin_users_controller_1.listUsers);

/**
 * 🗂️ PATCH /api/admin/users/:id/archive
 */
router.patch("/users/:id/archive", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), admin_users_controller_1.archiveUser);

/**
 * 🔐 PATCH /api/admin/users/:id/reset-password
 */
router.patch("/users/:id/reset-password", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const userId = Number(req.params.id);

        if (Number.isNaN(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        const user = await client_1.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (req.user?.id === userId) {
            return res.status(400).json({
                message: "You cannot reset your own password here",
            });
        }

        const tempPassword = generateTempPassword();
        const hashedPassword = await bcryptjs_1.default.hash(tempPassword, 10);

        await client_1.prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                mustChangePassword: true,
            },
        });

        return res.json({
            message: "Password reset successfully",
            temporaryPassword: tempPassword,
        });
    }
    catch (error) {
        console.error("Failed to reset password:", error);
        return res.status(500).json({
            message: "Failed to reset password",
        });
    }
});

/**
 * Shared admin user creation helper
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
 * 🚨 TEMPORARY TEST ROUTE
 */
router.post("/users/student", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (_req, res) => {
    return res.status(400).json({
        message: "BACKEND VERSION TEST 123",
    });
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
        return res.status(400).json({
            message: "User must exist and have STUDENT role",
        });
    }

    if (student.userId) {
        return res.status(409).json({
            message: "Student already linked to a user",
        });
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

    return res.json({
        message: "Student successfully linked to user",
    });
});

exports.default = router;