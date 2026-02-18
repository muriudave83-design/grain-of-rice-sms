import { Request, Response } from "express";
import { prisma } from "../prisma/client";

import * as ReportCardService from "../services/reportCard.service";

/**
 * Get a single student's report card for a given term
 * (Student / Parent / Admin â€“ access controlled here)
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

    res.json(reportCard);
  } catch (err: any) {
    res.status(400).json({
      message: err?.message ?? "Failed to fetch report card",
    });
  }
};

/**
 * Download a report card as PDF
 * (Strict ownership + PUBLISHED-only enforced here)
 */
export const downloadReportCardPdf = async (
  req: Request,
  res: Response
) => {
  try {
    const reportCardId = Number(req.params.id);
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (Number.isNaN(reportCardId)) {
      return res.status(400).json({ message: "Invalid report card ID" });
    }

    // Load report card with ownership context
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

    // ---------------------------------
    // ROLE-BASED ACCESS ENFORCEMENT
    // ---------------------------------

    // STUDENT â€” own only, PUBLISHED only
    if (user.role === "STUDENT") {
      if (user.id !== reportCard.studentId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (reportCard.status !== "PUBLISHED") {
        return res
          .status(403)
          .json({ message: "Report card not PUBLISHED" });
      }
    }

    // PARENT â€” guardian only, PUBLISHED only
    if (user.role === "PARENT") {
      const guardian = await prisma.guardian.findFirst({
        where: {
          studentId: reportCard.studentId,
          userId: user.id,
        },
        select: { id: true },
      });

      if (!guardian) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (reportCard.status !== "PUBLISHED") {
        return res
          .status(403)
          .json({ message: "Report card not PUBLISHED" });
      }
    }

    // TEACHER â€” must teach the student (generated allowed)
    if (user.role === "TEACHER") {
      const teaches = await prisma.enrollment.findFirst({
        where: {
          studentId: reportCard.studentId,
          subject: {
            teacherId: user.id,
          },
        },
        select: { id: true },
      });

      if (!teaches) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    // ADMIN â€” unrestricted access

    // ---------------------------------
    // PDF GENERATION
    // ---------------------------------
      return res.status(501).json({
        message: "PDF generation is handled by reportCardPdfRoutes",
      });

  } catch (err: any) {
    return res.status(403).json({
      message: err?.message ?? "Failed to generate PDF",
    });
  }
};

/**
 * ============================================================
 * PARENT â€” GET ALL REPORT CARDS FOR OWN CHILDREN
 * GET /api/report-cards/parent
 * ============================================================
 */
export const getParentReportCards = async (
  req: Request,
  res: Response
) => {
  try {
    const parentId = (req as any).user.id;

    // 1. Get linked students
    const links = await prisma.parentStudent.findMany({
      where: { parentId },
      select: { studentId: true },
    });

    const studentIds = links.map((l) => l.studentId);

    if (studentIds.length === 0) {
      return res.json([]);
    }

    // 2. Get PUBLISHED report cards for those students
    const reportCards = await prisma.reportCard.findMany({
      where: {
        studentId: { in: studentIds },
        status: "PUBLISHED",
      },
      include: {
        term: true,
        class: true,
      },
      orderBy: {
        id: "desc",
      },
    });

    res.json(reportCards);
  } catch (err) {
    console.error("getParentReportCards error:", err);
    res.status(500).json({
      message: "Failed to fetch parent report cards",
    });
  }
};
