"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReportCardPdf = getReportCardPdf;
const reportCardPdf_service_1 = require("../services/pdf/reportCardPdf.service");
/**
 * GET /api/report-cards/:id/pdf
 */
async function getReportCardPdf(req, res) {
    const reportCardId = Number(req.params.id);
    if (Number.isNaN(reportCardId)) {
        return res.status(400).json({ message: "Invalid report card id" });
    }
    try {
        const pdfBuffer = await (0, reportCardPdf_service_1.generateReportCardPdf)(reportCardId);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="report-card-${reportCardId}.pdf"`);
        return res.status(200).send(pdfBuffer);
    }
    catch (error) {
        // Phase-8 policy: keep errors simple and safe
        if (error.message === "Report card not found") {
            return res.status(404).json({ message: error.message });
        }
        if (error.message === "Report card is not published") {
            return res.status(403).json({ message: error.message });
        }
        console.error("PDF generation error:", error);
        return res.status(500).json({ message: "Failed to generate report card PDF" });
    }
}
