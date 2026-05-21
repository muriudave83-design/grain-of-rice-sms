"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../../prisma/client");
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../../middlewares/rolesMiddleware");
const client_2 = require("@prisma/client");
const router = (0, express_1.Router)();
/**
 * ============================================================
 * ADMIN — LIST SUBJECTS (UPDATED ✅ SEARCH + HIDE ARCHIVED)
 * GET /api/admin/subjects
 * ============================================================
 */
router.get("/subjects", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.ADMIN]), async (req, res) => {
    try {
        const { search } = req.query;
        const subjects = await client_1.prisma.subject.findMany({
            where: {
                isArchived: false,
                ...(search && {
                    OR: [
                        {
                            name: {
                                contains: String(search),
                                mode: "insensitive",
                            },
                        },
                        {
                            code: {
                                contains: String(search),
                                mode: "insensitive",
                            },
                        },
                    ],
                }),
            },
            include: {
                teacher: true,
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(subjects);
    }
    catch (error) {
        console.error("FETCH SUBJECTS ERROR:", error);
        res.status(500).json({ error: "Failed to fetch subjects" });
    }
});
/**
 * ============================================================
 * ADMIN — CREATE SUBJECT
 * POST /api/admin/subjects
 * ============================================================
 */
router.post("/subjects", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.ADMIN]), async (req, res) => {
    try {
        const { name, code } = req.body;
        if (!name) {
            return res.status(400).json({ error: "Subject name required" });
        }
        const existing = await client_1.prisma.subject.findFirst({
            where: {
                name: name,
            },
        });
        if (existing) {
            return res.status(400).json({
                error: "Subject already exists",
            });
        }
        const subject = await client_1.prisma.subject.create({
            data: {
                name,
                code: code || null,
            },
        });
        res.status(201).json(subject);
    }
    catch (error) {
        console.error("CREATE SUBJECT ERROR:", error);
        if (error instanceof client_2.Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002") {
            return res.status(400).json({
                error: "Subject with this code already exists",
            });
        }
        res.status(500).json({
            error: "Failed to create subject",
        });
    }
});
/**
 * ============================================================
 * ADMIN — EDIT SUBJECT ✅ NEW
 * PATCH /api/admin/subjects/:id
 * ============================================================
 */
router.patch("/subjects/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.ADMIN]), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code } = req.body;
        const updated = await client_1.prisma.subject.update({
            where: { id: Number(id) },
            data: { name, code },
        });
        res.json(updated);
    }
    catch (error) {
        console.error("UPDATE SUBJECT ERROR:", error);
        res.status(500).json({ error: "Failed to update subject" });
    }
});
/**
 * ============================================================
 * ADMIN — ARCHIVE SUBJECT ✅ NEW
 * PATCH /api/admin/subjects/:id/archive
 * ============================================================
 */
router.patch("/subjects/:id/archive", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.ADMIN]), async (req, res) => {
    try {
        const { id } = req.params;
        const archived = await client_1.prisma.subject.update({
            where: { id: Number(id) },
            data: { isArchived: true },
        });
        res.json({ message: "Subject archived", archived });
    }
    catch (error) {
        console.error("ARCHIVE SUBJECT ERROR:", error);
        res.status(500).json({ error: "Failed to archive subject" });
    }
});
/**
 * ============================================================
 * ADMIN — ASSIGN TEACHER TO SUBJECT
 * PUT /api/admin/subjects/:id/assign-teacher
 * ============================================================
 */
router.put("/subjects/:id/assign-teacher", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.ADMIN]), async (req, res) => {
    try {
        const subjectId = Number(req.params.id);
        const { teacherId } = req.body;
        if (!teacherId) {
            return res.status(400).json({ message: "teacherId required" });
        }
        const teacher = await client_1.prisma.user.findUnique({
            where: { id: teacherId },
        });
        if (!teacher || teacher.role !== client_2.Role.TEACHER) {
            return res.status(400).json({ message: "Invalid teacher" });
        }
        const updated = await client_1.prisma.subject.update({
            where: { id: subjectId },
            data: { teacherId },
        });
        res.json(updated);
    }
    catch (error) {
        console.error("ASSIGN TEACHER ERROR:", error);
        res.status(500).json({ error: "Failed to assign teacher" });
    }
});
exports.default = router;
