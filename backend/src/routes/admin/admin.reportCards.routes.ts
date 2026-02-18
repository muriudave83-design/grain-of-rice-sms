import { Router } from "express";
import { prisma } from "../../prisma/client";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";

const router = Router();

/**
 * ============================================================
 * ADMIN â€” PUBLISH REPORT CARDS
 * ============================================================
 */
router.post(
  "/report-cards/publish",
  authenticate,
  requireRole([Role.ADMIN]),
  async (req, res) => {
    const { classId, termId } = req.body;

    if (!classId || !termId) {
      return res.status(400).json({ message: "classId and termId required" });
    }

    // Ensure all assessments are submitted
    const pending = await prisma.assessment.findFirst({
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

    await prisma.reportCard.updateMany({
      where: { classId, termId },
      data: { status: "PUBLISHED" },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: String(req.user!.id),   // âœ… schema-aligned
        actorRole: req.user!.role,           // âœ… stored as string
        action: "REPORT_CARDS_PUBLISHED",
        entityType: "REPORT_CARD",
        entityId: `${classId}:${termId}`,
        metadata: { classId, termId },
      },
    });

    res.json({ message: "Report cards PUBLISHED successfully" });
  }
);

/**
 * ============================================================
 * ADMIN â€” UNPUBLISH REPORT CARDS
 * ============================================================
 */
router.post(
  "/report-cards/unpublish",
  authenticate,
  requireRole([Role.ADMIN]),
  async (req, res) => {
    const { classId, termId } = req.body;

    if (!classId || !termId) {
      return res.status(400).json({ message: "classId and termId required" });
    }

    const PUBLISHED = await prisma.reportCard.findFirst({
      where: {
        classId,
        termId,
        status: "PUBLISHED",
      },
    });

    if (!PUBLISHED) {
      return res.status(400).json({
        message: "Report cards are not PUBLISHED",
      });
    }

    await prisma.reportCard.updateMany({
      where: { classId, termId },
      data: { status: "GENERATED" },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: String(req.user!.id),
        actorRole: req.user!.role,
        action: "REPORT_CARDS_UNPUBLISHED",
        entityType: "REPORT_CARD",
        entityId: `${classId}:${termId}`,
        metadata: { classId, termId },
      },
    });

    res.json({ message: "Report cards unpublished successfully" });
  }
);

export default router;
