import { Router } from "express";
import { prisma } from "../prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";

// âœ… CONTROLLER IMPORT (CRITICAL)
import {
  getParentReportCards,
} from "../controllers/reportCard.controller";

const router = Router();

/**
 * ============================================================
 * STUDENT â€” GET MY REPORT CARDS
 * GET /api/report-cards/me
 * âš ï¸ MUST COME BEFORE /:id
 * ============================================================
 */
router.get(
  "/me",
  authenticate,
  requireRole([Role.STUDENT]),
  async (req, res) => {
    const user = req.user;

    if (!user?.studentId) {
      return res.status(400).json({
        message: "Student account not linked",
      });
    }

    const reportCards = await prisma.reportCard.findMany({
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
  }
);

/**
 * ============================================================
 * PARENT â€” GET REPORT CARDS FOR OWN CHILDREN
 * GET /api/report-cards/parent
 * ============================================================
 */
router.get(
  "/parent",
  authenticate,
  requireRole([Role.PARENT]),
  getParentReportCards
);

/**
 * ============================================================
 * READ â€” GET SINGLE REPORT CARD (ADMIN / PARENT)
 * GET /api/report-cards/:id
 * ============================================================
 */
router.get(
  "/:id",
  authenticate,
  async (req, res) => {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid report card id",
      });
    }

    const reportCard = await prisma.reportCard.findUnique({
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
    if (
      reportCard.status !== "PUBLISHED" &&
      req.user?.role !== Role.ADMIN
    ) {
      return res.status(403).json({
        message: "You are not authorized to view this report card",
      });
    }

    // ðŸ”’ Parent ownership check
    if (req.user?.role === Role.PARENT) {
      const parentStudent = await prisma.parentStudent.findFirst({
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
  }
);

export { router as reportCardReadRoutes };
