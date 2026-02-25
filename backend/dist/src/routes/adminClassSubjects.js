"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../prisma/client");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const client_2 = require("@prisma/client");
const prisma = client_1.prisma;
const router = (0, express_1.Router)();
/**
 * ============================================================
 * ADMIN — ASSIGN SUBJECT TO CLASS
 * POST /api/admin/class-subjects
 * ============================================================
 */
router.post("/class-subjects", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.ADMIN]), async (req, res) => {
    const { classId, subjectId } = req.body;
    if (!classId || !subjectId) {
        return res.status(400).json({ message: "classId and subjectId required" });
    }
    const link = await prisma.classSubject.create({
        data: { classId, subjectId },
    });
    res.status(201).json(link);
});
/**
 * ============================================================
 * ADMIN — LIST CLASS ↔ SUBJECT ASSIGNMENTS
 * GET /api/admin/class-subjects
 * ============================================================
 */
router.get("/class-subjects", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.ADMIN]), async (_req, res) => {
    const data = await prisma.classSubject.findMany({
        include: {
            class: true,
            subject: true,
        },
        orderBy: {
            id: "desc",
        },
    });
    res.json(data);
});
exports.default = router;
