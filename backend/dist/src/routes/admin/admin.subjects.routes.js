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
 * ADMIN — LIST SUBJECTS
 * GET /api/admin/subjects
 * ============================================================
 */
router.get("/subjects", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.ADMIN]), async (_req, res) => {
    const subjects = await client_1.prisma.subject.findMany({
        include: {
            teacher: true,
        },
        orderBy: { createdAt: "desc" },
    });
    res.json(subjects);
});
/**
 * ============================================================
 * ADMIN — CREATE SUBJECT
 * POST /api/admin/subjects
 * ============================================================
 */
router.post("/subjects", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.ADMIN]), async (req, res) => {
    const { name, code } = req.body;
    if (!name) {
        return res.status(400).json({ message: "Subject name required" });
    }
    const subject = await client_1.prisma.subject.create({
        data: {
            name,
            code: code || null,
        },
    });
    res.status(201).json(subject);
});
/**
 * ============================================================
 * ✅ ADMIN — ASSIGN TEACHER TO SUBJECT (CRITICAL FIX)
 * PUT /api/admin/subjects/:id/assign-teacher
 * ============================================================
 */
router.put("/subjects/:id/assign-teacher", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.ADMIN]), async (req, res) => {
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
});
exports.default = router;
