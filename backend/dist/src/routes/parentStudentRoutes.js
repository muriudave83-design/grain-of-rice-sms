"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parentStudentRoutes = void 0;
const express_1 = require("express");
const client_1 = require("../prisma/client");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const client_2 = require("@prisma/client");
const router = (0, express_1.Router)();
exports.parentStudentRoutes = router;
/**
 * ============================================================
 * ADMIN — LINK PARENT TO STUDENT
 * POST /api/parent-students
 * body: { parentId, studentId }
 * ============================================================
 */
router.post("/", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.ADMIN]), async (req, res) => {
    const { parentId, studentId } = req.body;
    if (typeof parentId !== "number" ||
        typeof studentId !== "number") {
        return res.status(400).json({
            message: "parentId and studentId must be numbers",
        });
    }
    // Prevent duplicate links
    const existing = await client_1.prisma.parentStudent.findFirst({
        where: { parentId, studentId },
    });
    if (existing) {
        return res.status(400).json({
            message: "Parent already linked to this student",
        });
    }
    const link = await client_1.prisma.parentStudent.create({
        data: { parentId, studentId },
    });
    res.json(link);
});
// GET children linked to logged-in parent
router.get("/", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.PARENT]), async (req, res) => {
    try {
        const user = req.user;
        if (!user || user.role !== "PARENT") {
            return res.status(403).json({ message: "Forbidden" });
        }
        const links = await client_1.prisma.parentStudent.findMany({
            where: { parentId: user.id },
            include: {
                student: {
                    include: {
                        class: true,
                    },
                },
            },
        });
        res.json(links);
    }
    catch (err) {
        console.error("Parent students fetch error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});
