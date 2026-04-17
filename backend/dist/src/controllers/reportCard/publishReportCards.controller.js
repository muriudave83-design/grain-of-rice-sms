"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishReportCards = publishReportCards;
const client_1 = require("../../prisma/client");
const client_2 = require("@prisma/client");
/**
 * POST /report-cards/publish
 * Body: { termId: number; classId: number }
 *
 * Rules:
 * - ADMIN only
 * - Only GENERATED report cards may be published
 * - All report cards must be complete (no missing subject entries)
 * - Operation is atomic
 */
async function publishReportCards(req, res) {
    try {
        const { termId, classId } = req.body ?? {};
        if (!termId || !classId) {
            return res.status(400).json({
                message: "termId and classId are required",
            });
        }
        // Validate term
        const term = await client_1.prisma.term.findUnique({
            where: { id: Number(termId) },
        });
        if (!term) {
            return res.status(400).json({ message: "Invalid termId" });
        }
        // Validate class
        const classroom = await client_1.prisma.class.findUnique({
            where: { id: Number(classId) },
        });
        if (!classroom) {
            return res.status(400).json({ message: "Invalid classId" });
        }
        // Fetch all GENERATED report cards for this class + term
        const reportCards = await client_1.prisma.reportCard.findMany({
            where: {
                termId: Number(termId),
                classId: Number(classId),
                status: client_2.ReportCardStatus.GENERATED,
            },
            include: {
                subjects: true, // ✅ FIX: include relation
            },
        });
        if (reportCards.length === 0) {
            return res.status(400).json({
                message: "No GENERATED report cards found to publish",
            });
        }
        // Validate completeness
        const incomplete = [];
        for (const rc of reportCards) {
            // ✅ FIX: subjects is guaranteed because of include, but keep safety check
            if (!rc.subjects || rc.subjects.length === 0) {
                incomplete.push({
                    studentId: rc.studentId,
                    reason: "No subject entries",
                });
                continue;
            }
            // ✅ FIX: typed param (no implicit any)
            const hasMissing = rc.subjects.some((s) => Number.isNaN(s.total));
            if (hasMissing) {
                incomplete.push({
                    studentId: rc.studentId,
                    reason: "Missing or invalid subject scores",
                });
            }
        }
        if (incomplete.length > 0) {
            return res.status(422).json({
                message: "Some report cards are incomplete and cannot be published",
                details: incomplete,
            });
        }
        // Publish atomically
        const result = await client_1.prisma.$transaction(async (tx) => {
            const update = await tx.reportCard.updateMany({
                where: {
                    termId: Number(termId),
                    classId: Number(classId),
                    status: client_2.ReportCardStatus.GENERATED,
                },
                data: {
                    status: client_2.ReportCardStatus.PUBLISHED,
                    publishedAt: new Date(), // ✅ GOOD PRACTICE (optional but recommended)
                },
            });
            return update.count;
        });
        return res.status(200).json({
            message: "Report cards published successfully",
            termId: Number(termId),
            classId: Number(classId),
            publishedCount: result,
        });
    }
    catch (error) {
        console.error("publishReportCards error:", error);
        return res.status(500).json({
            message: "Failed to publish report cards",
            error: error.message,
        });
    }
}
