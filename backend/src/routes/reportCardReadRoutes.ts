import { Router } from "express";
import { prisma } from "../prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";

const router = Router();

/**
 * ============================================================
 * STUDENT — VIEW OWN REPORT CARD (TERM)
 * GET /api/report-cards/me?termId=
 * ============================================================
 */
router.get(
  "/me",
  authenticate,
  requireRole([Role.STUDENT]),
  async (req, res) => {
    const user = req.user!;

    const student = await prisma.student.findFirst({
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

    const reportCard = await prisma.reportCard.findUnique({
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
  }
);

/**
 * ============================================================
 * PARENT — VIEW CHILDREN REPORT CARDS
 * GET /api/report-cards/parent
 * ============================================================
 */
router.get(
  "/parent",
  authenticate,
  requireRole([Role.PARENT]),
  async (req, res) => {
    const parentId = req.user!.id;

    const links = await prisma.parentStudent.findMany({
      where: { parentId },
      select: { studentId: true },
    });

    if (links.length === 0) {
      return res.json([]);
    }

    const studentIds = links.map(l => l.studentId);

    const reportCards = await prisma.reportCard.findMany({
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
  }
);

/**
 * ============================================================
 * ADMIN / PARENT — VIEW REPORT CARD BY ID
 * GET /api/report-cards/:id
 * ============================================================
 */
router.get(
  "/:id",
  authenticate,
  requireRole([Role.ADMIN, Role.PARENT]),
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

    // 🔐 PARENT ACCESS GUARD
    if (req.user!.role === Role.PARENT) {
      const link = await prisma.parentStudent.findFirst({
        where: {
          parentId: req.user!.id,
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
  }
);

export { router as reportCardReadRoutes };
