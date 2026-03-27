"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportCardReadRoutes = void 0;
const express_1 = require("express");
const client_1 = require("../prisma/client");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const client_2 = require("@prisma/client");
const router = (0, express_1.Router)();
exports.reportCardReadRoutes = router;
// 🔥 GLOBAL DEBUG (CONFIRMS FILE IS USED)
console.log("🔥 reportCardReadRoutes.ts LOADED");
/**
 * ============================================================
 * TEACHER — COMPUTED REPORT CARDS (☢️ NUCLEAR DEBUG VERSION)
 * ============================================================
 */
router.get("/teacher/:classId/:term", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    console.log("☢️ NUCLEAR DEBUG ROUTE HIT");
    try {
        // ✅ FIXED: correct Prisma model name
        const scores = await client_1.prisma.assessmentScore.findMany({
            include: {
                assessment: true,
                student: true,
            },
        });
        console.log("🔥 ALL SCORES:", JSON.stringify(scores, null, 2));
        return res.json({
            debugCount: scores.length,
        });
    }
    catch (err) {
        console.error("🔥 DEBUG ERROR:", err);
        res.status(500).json({ message: "Debug failed" });
    }
});
/**
 * ============================================================
 * STUDENT — VIEW OWN REPORT CARD (TERM)
 * ============================================================
 */
router.get("/me", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.STUDENT]), async (req, res) => {
    const user = req.user;
    const student = await client_1.prisma.student.findFirst({
        where: { userId: user.id },
        select: { id: true },
    });
    if (!student) {
        return res.status(404).json({ message: "Student record not found" });
    }
    const termIdRaw = req.query.termId;
    if (typeof termIdRaw !== "string") {
        return res.status(400).json({ message: "termId is required" });
    }
    const termId = Number(termIdRaw);
    if (Number.isNaN(termId)) {
        return res.status(400).json({ message: "Invalid termId" });
    }
    const reportCard = await client_1.prisma.reportCard.findUnique({
        where: {
            studentId_termId: {
                studentId: student.id,
                termId,
            },
        },
        include: {
            subjects: {
                include: { subject: true },
            },
            term: true,
            class: true,
        },
    });
    if (!reportCard || reportCard.status !== "PUBLISHED") {
        return res.status(404).json({
            message: "Report card not available",
        });
    }
    res.json(reportCard);
});
/**
 * ============================================================
 * PARENT — VIEW CHILDREN REPORT CARDS
 * ============================================================
 */
router.get("/parent", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.PARENT]), async (req, res) => {
    const parentId = req.user.id;
    const links = await client_1.prisma.parentStudent.findMany({
        where: { parentId },
        select: { studentId: true },
    });
    if (links.length === 0) {
        return res.json([]);
    }
    const studentIds = links.map((l) => l.studentId);
    const reportCards = await client_1.prisma.reportCard.findMany({
        where: {
            studentId: { in: studentIds },
            status: "PUBLISHED",
        },
        include: {
            student: true,
            class: true,
            term: true,
        },
    });
    res.json(reportCards);
});
/**
 * ============================================================
 * ADMIN / PARENT — VIEW REPORT CARD BY ID
 * ============================================================
 */
router.get("/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.ADMIN, client_2.Role.PARENT]), async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).json({
            message: "Invalid report card id",
        });
    }
    const reportCard = await client_1.prisma.reportCard.findUnique({
        where: { id },
        include: {
            subjects: {
                include: { subject: true },
            },
            student: true,
            class: true,
            term: true,
        },
    });
    if (!reportCard || reportCard.status !== "PUBLISHED") {
        return res.status(404).json({
            message: "Report card not available",
        });
    }
    if (req.user.role === client_2.Role.PARENT) {
        const link = await client_1.prisma.parentStudent.findFirst({
            where: {
                parentId: req.user.id,
                studentId: reportCard.studentId,
            },
        });
        if (!link) {
            return res.status(403).json({
                message: "You are not allowed to view this report card",
            });
        }
    }
    res.json(reportCard);
});
