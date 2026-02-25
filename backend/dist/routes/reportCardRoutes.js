"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportCardReadRoutes = void 0;
const express_1 = require("express");
const client_1 = require("../prisma/client");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const client_2 = require("@prisma/client");
// âœ… CONTROLLER IMPORT (CRITICAL)
const reportCard_controller_1 = require("../controllers/reportCard.controller");
const router = (0, express_1.Router)();
exports.reportCardReadRoutes = router;
/**
 * ============================================================
 * STUDENT â€” GET MY REPORT CARDS
 * GET /api/report-cards/me
 * âš ï¸ MUST COME BEFORE /:id
 * ============================================================
 */
router.get("/me", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.STUDENT]), async (req, res) => {
    const user = req.user;
    if (!user?.studentId) {
        return res.status(400).json({
            message: "Student account not linked",
        });
    }
    const reportCards = await client_1.prisma.reportCard.findMany({
        where: {
            studentId: user.studentId,
            status: "PUBLISHED",
        },
        include: {
            class: true,
            term: true,
        },
        orderBy: {
            publishedAt: "desc",
        },
    });
    res.json(reportCards);
});
/**
 * ============================================================
 * PARENT â€” GET REPORT CARDS FOR OWN CHILDREN
 * GET /api/report-cards/parent
 * ============================================================
 */
router.get("/parent", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.PARENT]), reportCard_controller_1.getParentReportCards);
/**
 * ============================================================
 * READ â€” GET SINGLE REPORT CARD (ADMIN / PARENT)
 * GET /api/report-cards/:id
 * ============================================================
 */
router.get("/:id", authMiddleware_1.authenticate, async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).json({
            message: "Invalid report card id",
        });
    }
    const reportCard = await client_1.prisma.reportCard.findUnique({
        where: { id },
        include: {
            student: true,
            class: true,
            term: true,
        },
    });
    if (!reportCard) {
        return res.status(404).json({
            message: "Report card not found",
        });
    }
    // ðŸ”’ Block unpublished cards for non-admins
    if (reportCard.status !== "PUBLISHED" &&
        req.user?.role !== client_2.Role.ADMIN) {
        return res.status(403).json({
            message: "You are not authorized to view this report card",
        });
    }
    // ðŸ”’ Parent ownership check
    if (req.user?.role === client_2.Role.PARENT) {
        const parentStudent = await client_1.prisma.parentStudent.findFirst({
            where: {
                parentId: req.user.id,
                studentId: reportCard.studentId,
            },
        });
        if (!parentStudent) {
            return res.status(403).json({
                message: "You are not authorized to view this report card",
            });
        }
    }
    res.json(reportCard);
});
