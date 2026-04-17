"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../../prisma/client");
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../../middlewares/rolesMiddleware");
const client_2 = require("@prisma/client");
const client_3 = require("@prisma/client");
const router = (0, express_1.Router)();
/**
 * ============================================================
 * ADMIN â€” PUBLISH REPORT CARDS
 * ============================================================
 */
router.post("/report-cards/publish", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.ADMIN]), async (req, res) => {
    const { classId, termId } = req.body;
    if (!classId || !termId) {
        return res.status(400).json({ message: "classId and termId required" });
    }
    // Ensure all assessments are submitted
    const pending = await client_1.prisma.assessment.findFirst({
        where: {
            classId,
            termId,
            status: { not: "SUBMITTED" },
        },
    });
    if (pending) {
        return res.status(400).json({
            message: "All assessments must be SUBMITTED before publishing",
        });
    }
    await client_1.prisma.reportCard.updateMany({
        where: { classId, termId },
        data: { status: client_3.ReportCardStatus.PUBLISHED },
    });
    await client_1.prisma.auditLog.create({
        data: {
            actorUserId: String(req.user.id), // âœ… schema-aligned
            actorRole: req.user.role, // âœ… stored as string
            action: "REPORT_CARDS_PUBLISHED",
            entityType: "REPORT_CARD",
            entityId: `${classId}:${termId}`,
            metadata: { classId, termId },
        },
    });
    res.json({ message: "Report cards PUBLISHED successfully" });
});
/**
 * ============================================================
 * ADMIN â€” UNPUBLISH REPORT CARDS
 * ============================================================
 */
router.post("/report-cards/unpublish", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.ADMIN]), async (req, res) => {
    const { classId, termId } = req.body;
    if (!classId || !termId) {
        return res.status(400).json({ message: "classId and termId required" });
    }
    const PUBLISHED = await client_1.prisma.reportCard.findFirst({
        where: {
            classId,
            termId,
            status: client_3.ReportCardStatus.PUBLISHED,
        },
    });
    if (!PUBLISHED) {
        return res.status(400).json({
            message: "Report cards are not PUBLISHED",
        });
    }
    await client_1.prisma.reportCard.updateMany({
        where: { classId, termId },
        data: { status: client_3.ReportCardStatus.GENERATED },
    });
    await client_1.prisma.auditLog.create({
        data: {
            actorUserId: String(req.user.id),
            actorRole: req.user.role,
            action: "REPORT_CARDS_UNPUBLISHED",
            entityType: "REPORT_CARD",
            entityId: `${classId}:${termId}`,
            metadata: { classId, termId },
        },
    });
    res.json({ message: "Report cards unpublished successfully" });
});
exports.default = router;
