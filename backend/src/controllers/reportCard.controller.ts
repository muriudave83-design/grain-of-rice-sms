import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { ReportCardStatus } from "@prisma/client";

/**
 * Get a single student's report card for a given term
 * (Authorization assumed handled in route middleware)
 */
export const getStudentReportCard = async (
  req: Request,
  res: Response
) => {
  try {
    const reportCardId = Number(req.params.id);

    if (Number.isNaN(reportCardId)) {
      return res.status(400).json({ message: "Invalid report card ID" });
    }

    const reportCard = await prisma.reportCard.findUnique({
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
  } catch (err: any) {
    return res.status(400).json({
      message: err?.message ?? "Failed to fetch report card",
    });
  }
};

/**
 * Download a report card as PDF
 * (Authorization fully handled in route middleware)
 */
export const downloadReportCardPdf = async (
  req: Request,
  res: Response
) => {
  try {
    const reportCardId = Number(req.params.id);

    if (Number.isNaN(reportCardId)) {
      return res.status(400).json({ message: "Invalid report card ID" });
    }

    const reportCard = await prisma.reportCard.findUnique({
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
    if (reportCard.status !== ReportCardStatus.PUBLISHED) {
      return res.status(403).json({
        message: "Report card not published",
      });
    }

    // PDF generation delegated elsewhere
    return res.status(501).json({
      message: "PDF generation is handled by reportCardPdfRoutes",
    });
  } catch (err: any) {
    return res.status(500).json({
      message: err?.message ?? "Failed to generate PDF",
    });
  }
};

/**
 * ============================================================
 * PARENT — GET ALL REPORT CARDS FOR OWN CHILDREN
 * GET /api/report-cards/parent
 * ============================================================
 */
export const getParentReportCards = async (
  req: Request,
  res: Response
) => {
  try {
    const parentId = (req as any).user.id;

    const links = await prisma.parentStudent.findMany({
      where: { parentId },
      select: { studentId: true },
    });

    const studentIds = links.map((l) => l.studentId);

    if (studentIds.length === 0) {
      return res.json([]);
    }

    const reportCards = await prisma.reportCard.findMany({
      where: {
        studentId: { in: studentIds },
        status: ReportCardStatus.PUBLISHED,
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
  } catch (err) {
    console.error("getParentReportCards error:", err);
    return res.status(500).json({
      message: "Failed to fetch parent report cards",
    });
  }
};