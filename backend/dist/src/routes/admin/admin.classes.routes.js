"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../../prisma/client");
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../../middlewares/rolesMiddleware");
const router = (0, express_1.Router)();
/**
 * ✅ POST /api/admin/classes
 * Create a new class
 */
router.post("/classes", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === "") {
            return res.status(400).json({
                message: "Class name is required",
            });
        }
        const existing = await client_1.prisma.class.findFirst({
            where: { name },
        });
        if (existing) {
            return res.status(409).json({
                message: "Class already exists",
            });
        }
        const schoolClass = await client_1.prisma.class.create({
            data: { name },
        });
        return res.status(201).json(schoolClass);
    }
    catch (error) {
        console.error("Create class failed:", error);
        return res.status(500).json({
            message: "Failed to create class",
        });
    }
});
/**
 * ✅ GET /api/admin/classes
 * Fetch all classes
 */
router.get("/classes", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (_req, res) => {
    try {
        const classes = await client_1.prisma.class.findMany({
            where: { isArchived: false }, // ✅ hide archived
            orderBy: { createdAt: "asc" },
        });
        return res.json(classes);
    }
    catch (error) {
        console.error("Fetch classes failed:", error);
        return res.status(500).json({
            message: "Failed to fetch classes",
        });
    }
});
/**
 * ✅ GET /api/admin/classes/:classId/students
 * Fetch students belonging to a specific class
 */
router.get("/classes/:classId/students", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const classId = Number(req.params.classId);
        if (isNaN(classId)) {
            return res.status(400).json({
                message: "Invalid class ID",
            });
        }
        const cls = await client_1.prisma.class.findUnique({
            where: { id: classId },
        });
        if (!cls) {
            return res.status(404).json({
                message: "Class not found",
            });
        }
        const students = await client_1.prisma.student.findMany({
            where: { classId },
            include: {
                parentLinks: {
                    include: {
                        parent: true,
                    },
                },
            },
        });
        // Return raw students array (matches your frontend)
        return res.json(students);
    }
    catch (error) {
        console.error("Fetch class students failed:", error);
        return res.status(500).json({
            message: "Failed to fetch students",
        });
    }
});
/**
 * 🗂️ PATCH /api/admin/classes/:id/archive
 * Archive a class (safe delete)
 */
router.patch("/classes/:id/archive", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    const { id } = req.params;
    try {
        // 🔒 Prevent archiving if students exist
        const studentCount = await client_1.prisma.student.count({
            where: { classId: Number(id) },
        });
        if (studentCount > 0) {
            return res.status(400).json({
                message: "Cannot archive class with assigned students",
            });
        }
        await client_1.prisma.class.update({
            where: { id: Number(id) },
            data: { isArchived: true },
        });
        res.json({ message: "Class archived" });
    }
    catch (err) {
        console.error("Failed to archive class", err);
        res.status(500).json({
            message: "Failed to archive class",
        });
    }
});
exports.default = router;
