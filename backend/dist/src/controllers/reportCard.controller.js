"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParentReportCards = exports.downloadReportCardPdf = exports.getStudentReportCard = void 0;
const client_1 = require("../prisma/client");
const client_2 = require("@prisma/client");
/**
 * Get a single student's report card for a given term
 * (Authorization assumed handled in route middleware)
 */
const getStudentReportCard = async (req, res) => {
    try {
        const reportCardId = Number(req.params.id);
        if (Number.isNaN(reportCardId)) {
            return res.status(400).json({ message: "Invalid report card ID" });
        }
        const reportCard = await client_1.prisma.reportCard.findUnique({
            where: { id: reportCardId },
            include: {
                student: true,
                class: true,
                term: true,
            },
        });
        if (!reportCard) {
            return res.status(404).json({ message: "Report card not found" });
        }
        return res.json(reportCard);
    }
    catch (err) {
        return res.status(400).json({
            message: err?.message ?? "Failed to fetch report card",
        });
    }
};
exports.getStudentReportCard = getStudentReportCard;
/**
 * Download a report card as PDF
 * (Authorization fully handled in route middleware)
 */
const downloadReportCardPdf = async (req, res) => {
    try {
        const reportCardId = Number(req.params.id);
        if (Number.isNaN(reportCardId)) {
            return res.status(400).json({ message: "Invalid report card ID" });
        }
        const reportCard = await client_1.prisma.reportCard.findUnique({
            where: { id: reportCardId },
            select: {
                id: true,
                status: true,
                studentId: true,
                classId: true,
            },
        });
        if (!reportCard) {
            return res.status(404).json({ message: "Report card not found" });
        }
        // Business rule (NOT auth): only allow PDF for published reports
        if (reportCard.status !== client_2.ReportCardStatus.PUBLISHED) {
            return res.status(403).json({
                message: "Report card not published",
            });
        }
        // PDF generation delegated elsewhere
        return res.status(501).json({
            message: "PDF generation is handled by reportCardPdfRoutes",
        });
    }
    catch (err) {
        return res.status(500).json({
            message: err?.message ?? "Failed to generate PDF",
        });
    }
};
exports.downloadReportCardPdf = downloadReportCardPdf;
/**
 * ============================================================
 * PARENT — GET ALL REPORT CARDS FOR OWN CHILDREN
 * GET /api/report-cards/parent
 * ============================================================
 */
const getParentReportCards = async (req, res) => {
    try {
        const parentId = req.user.id;
        const links = await client_1.prisma.parentStudent.findMany({
            where: { parentId },
            select: { studentId: true },
        });
        const studentIds = links.map((l) => l.studentId);
        if (studentIds.length === 0) {
            return res.json([]);
        }
        const reportCards = await client_1.prisma.reportCard.findMany({
            where: {
                studentId: { in: studentIds },
                status: client_2.ReportCardStatus.PUBLISHED,
            },
            include: {
                term: true,
                class: true,
            },
            orderBy: {
                id: "desc",
            },
        });
        return res.json(reportCards);
    }
    catch (err) {
        console.error("getParentReportCards error:", err);
        return res.status(500).json({
            message: "Failed to fetch parent report cards",
        });
    }
};
exports.getParentReportCards = getParentReportCards;
