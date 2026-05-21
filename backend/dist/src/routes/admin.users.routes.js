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
 * ✅ GET /api/admin/stats
 */
router.get("/stats", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (_req, res) => {
    try {
        const [students, teachers, parents, classes] = await Promise.all([
            client_1.prisma.student.count(),
            client_1.prisma.user.count({ where: { role: "TEACHER" } }),
            client_1.prisma.user.count({ where: { role: "PARENT" } }),
            client_1.prisma.class.count(),
        ]);
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
 */
router.get("/users", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), admin_users_controller_1.listUsers);
/**
 * ✏️ PATCH /api/admin/users/:id (Update user)
 */
router.patch("/users/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), admin_users_controller_1.updateUser);
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
        if (!userId) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        const user = await client_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (!req.user) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }
        if (req.user.id === userId) {
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
 * POST /api/admin/users/teacher
 */
router.post("/users/teacher", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Missing fields" });
        }
        const existing = await client_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await client_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "TEACHER",
                mustChangePassword: true,
            },
        });
        return res.status(201).json(user);
    }
    catch (error) {
        console.error("Failed to create teacher:", error);
        return res.status(400).json({ message: error.message });
    }
});
/**
 * ✅ CREATE ATTENDANCE OFFICER
 */
router.post("/users/attendance-officer", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Missing fields",
            });
        }
        const existing = await client_1.prisma.user.findUnique({
            where: { email },
        });
        if (existing) {
            return res.status(400).json({
                message: "User already exists",
            });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await client_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "ATTENDANCE_OFFICER",
                mustChangePassword: true,
            },
        });
        return res.status(201).json(user);
    }
    catch (error) {
        console.error("Failed to create attendance officer:", error);
        return res.status(400).json({
            message: error.message,
        });
    }
});
/**
 * ✅ CREATE PARENT (USER + PARENT LINKED)
 */
router.post("/users/parent", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Missing fields" });
        }
        const existing = await client_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await client_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "PARENT",
                mustChangePassword: true,
                parent: {
                    create: {
                        name,
                        email, // keep consistent
                    },
                },
            },
            include: {
                parent: true,
            },
        });
        return res.status(201).json(user);
    }
    catch (error) {
        console.error("Failed to create parent:", error);
        return res.status(400).json({ message: error.message });
    }
});
/**
 * ✅ CREATE STUDENT (USER + STUDENT LINKED)
 */
router.post("/users/student", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const { firstName, lastName, email, password, classId } = req.body;
        if (!firstName || !email || !password || !classId) {
            return res.status(400).json({
                message: "firstName, email, password, classId are required",
            });
        }
        const existing = await client_1.prisma.user.findUnique({
            where: { email },
        });
        if (existing) {
            return res.status(400).json({
                message: "User already exists",
            });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await client_1.prisma.user.create({
            data: {
                name: `${firstName} ${lastName || ""}`.trim(),
                email,
                password: hashedPassword,
                role: "STUDENT",
                mustChangePassword: true,
                student: {
                    create: {
                        firstName,
                        lastName,
                        admissionNo: Math.floor(Math.random() * 100000).toString(),
                        classId: Number(classId), // ✅ REQUIRED FIX
                    },
                },
            },
            include: {
                student: true,
            },
        });
        return res.status(201).json(user);
    }
    catch (error) {
        console.error("Create student error:", error);
        return res.status(500).json({
            message: "Failed to create student user",
        });
    }
});
/**
 * 🔗 POST /api/admin/students/:studentId/link-user
 * (KEEP — useful fallback)
 */
router.post("/students/:studentId/link-user", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const studentId = Number(req.params.studentId);
        const userId = Number(req.body.userId);
        if (!studentId || !userId) {
            return res.status(400).json({ message: "Invalid input" });
        }
        const [student, user] = await Promise.all([
            client_1.prisma.student.findUnique({ where: { id: studentId } }),
            client_1.prisma.user.findUnique({ where: { id: userId } }),
        ]);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        if (!user || user.role !== "STUDENT") {
            return res.status(400).json({
                message: "User must exist and have STUDENT role",
            });
        }
        if (student.userId) {
            return res.status(409).json({
                message: "Student already linked",
            });
        }
        const alreadyLinked = await client_1.prisma.student.findFirst({
            where: { userId },
        });
        if (alreadyLinked) {
            return res.status(409).json({
                message: "User already linked to another student",
            });
        }
        await client_1.prisma.student.update({
            where: { id: studentId },
            data: { userId },
        });
        return res.json({
            message: "Student successfully linked to user",
        });
    }
    catch (error) {
        console.error("Link user error:", error);
        return res.status(500).json({
            message: "Failed to link user",
        });
    }
});
exports.default = router;
