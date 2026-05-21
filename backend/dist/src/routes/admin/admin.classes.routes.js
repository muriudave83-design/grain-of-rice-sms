"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../../prisma/client");
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../../middlewares/rolesMiddleware");
const router = (0, express_1.Router)();
/**
 * ✅ POST /api/admin/classes
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
 * Supports archived toggle
 */
router.get("/classes", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const includeArchived = req.query.includeArchived === "true";
        const classes = await client_1.prisma.class.findMany({
            where: includeArchived
                ? {}
                : { isArchived: false },
            orderBy: {
                createdAt: "asc",
            },
            include: {
                _count: {
                    select: {
                        students: true,
                    },
                },
            },
        });
        // ✅ Normalize response
        const formatted = classes.map((cls) => ({
            ...cls,
            studentCount: cls._count.students,
        }));
        return res.json(formatted);
    }
    catch (error) {
        console.error("Fetch classes failed:", error);
        return res.status(500).json({
            message: "Failed to fetch classes",
        });
    }
});
/**
 * ✏️ PUT /api/admin/classes/:id
 */
router.put("/classes/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name } = req.body;
        if (isNaN(id)) {
            return res.status(400).json({
                message: "Invalid class ID",
            });
        }
        if (!name || name.trim() === "") {
            return res.status(400).json({
                message: "Class name is required",
            });
        }
        const existing = await client_1.prisma.class.findUnique({
            where: { id },
        });
        if (!existing) {
            return res.status(404).json({
                message: "Class not found",
            });
        }
        const updated = await client_1.prisma.class.update({
            where: { id },
            data: { name },
        });
        return res.json(updated);
    }
    catch (error) {
        console.error("Update class failed:", error);
        return res.status(500).json({
            message: "Failed to update class",
        });
    }
});
/**
 * ✅ GET /api/admin/classes/:classId/students
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
 * ❌ DELETE /api/admin/classes/:id
 */
router.delete("/classes/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const classId = Number(req.params.id);
        if (isNaN(classId)) {
            return res.status(400).json({
                message: "Invalid class ID",
            });
        }
        const existing = await client_1.prisma.class.findUnique({
            where: { id: classId },
        });
        if (!existing) {
            return res.status(404).json({
                message: "Class not found",
            });
        }
        await client_1.prisma.class.delete({
            where: { id: classId },
        });
        return res.json({
            message: "Class deleted successfully",
        });
    }
    catch (error) {
        console.error("DELETE CLASS ERROR:", error);
        return res.status(500).json({
            message: "Failed to delete class",
        });
    }
});
/**
 * 🗂️ PATCH /api/admin/classes/:id/archive
 */
router.patch("/classes/:id/archive", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                message: "Invalid class ID",
            });
        }
        const existing = await client_1.prisma.class.findUnique({
            where: { id },
        });
        if (!existing) {
            return res.status(404).json({
                message: "Class not found",
            });
        }
        const studentCount = await client_1.prisma.student.count({
            where: { classId: id },
        });
        if (studentCount > 0) {
            return res.status(400).json({
                message: "Cannot archive class with assigned students",
            });
        }
        await client_1.prisma.class.update({
            where: { id },
            data: {
                isArchived: true,
            },
        });
        return res.json({
            message: "Class archived successfully",
        });
    }
    catch (error) {
        console.error("Failed to archive class", error);
        return res.status(500).json({
            message: "Failed to archive class",
        });
    }
});
exports.default = router;
