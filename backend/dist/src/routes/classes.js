"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../prisma/client");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const client_2 = require("@prisma/client");
const router = (0, express_1.Router)();
/**
 * ============================================================
 * 🟢 ADMIN — LIST CLASSES
 * GET /api/admin/classes
 * ============================================================
 */
router.get("/admin/classes", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.ADMIN]), async (_req, res) => {
    try {
        const classes = await client_1.prisma.class.findMany({
            orderBy: { createdAt: "desc" },
        });
        res.json(classes);
    }
    catch (error) {
        console.error("❌ Failed to list admin classes:", error);
        res.status(500).json({ message: "Failed to load classes" });
    }
});
/**
 * ============================================================
 * 🟢 ADMIN — CREATE CLASS
 * POST /api/admin/classes
 * ============================================================
 */
router.post("/admin/classes", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.ADMIN]), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Class name required" });
        }
        const cls = await client_1.prisma.class.create({
            data: { name },
        });
        res.status(201).json(cls);
    }
    catch (error) {
        console.error("❌ Failed to create class:", error);
        res.status(500).json({ message: "Failed to create class" });
    }
});
/**
 * ============================================================
 * 🟢 TEACHER — GET MY CLASSES
 * GET /api/classes/mine
 * ============================================================
 */
router.get("/mine", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    try {
        const teacherId = req.user.id;
        const classes = await client_1.prisma.class.findMany({
            where: {
                classSubjects: {
                    some: {
                        subject: {
                            teacherId: teacherId,
                        },
                    },
                },
            },
            orderBy: { name: "asc" },
        });
        res.json(classes);
    }
    catch (error) {
        console.error("❌ Failed to load teacher classes:", error);
        res.status(500).json({ message: "Failed to load classes" });
    }
});
/**
 * ============================================================
 * 🟢 TEACHER — GET SUBJECTS BY CLASS
 * GET /api/classes/:classId/subjects
 * ============================================================
 */
router.get("/:classId/subjects", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    try {
        const classId = Number(req.params.classId);
        const teacherId = req.user.id;
        const subjects = await client_1.prisma.classSubject.findMany({
            where: {
                classId,
                subject: {
                    teacherId,
                },
            },
            include: {
                subject: true,
            },
        });
        res.json(subjects.map((cs) => cs.subject));
    }
    catch (err) {
        console.error("❌ Failed to load subjects:", err);
        res.status(500).json({ message: "Failed to load subjects" });
    }
});
/**
 * ============================================================
 * 🟢 GET STUDENTS BY CLASS
 * GET /api/classes/:id/students
 * ============================================================
 */
router.get("/:id/students", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([
    client_2.Role.ADMIN,
    client_2.Role.TEACHER,
    client_2.Role.ATTENDANCE_OFFICER,
]), async (req, res) => {
    try {
        const classId = Number(req.params.id);
        if (isNaN(classId)) {
            return res.status(400).json({
                message: "Invalid class ID",
            });
        }
        const students = await client_1.prisma.student.findMany({
            where: {
                classId,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNo: true,
                classId: true,
            },
            orderBy: {
                firstName: "asc",
            },
        });
        return res.json(students);
    }
    catch (error) {
        console.error("❌ Failed to fetch students by class:", error);
        return res.status(500).json({
            message: "Failed to fetch students",
        });
    }
});
exports.default = router;
