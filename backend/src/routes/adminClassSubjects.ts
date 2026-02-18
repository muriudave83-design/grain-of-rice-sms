import { Router } from "express";
import { prisma as basePrisma } from "../prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";

const prisma: any = basePrisma;
const router = Router();

/**
 * ============================================================
 * ADMIN — ASSIGN SUBJECT TO CLASS
 * POST /api/admin/class-subjects
 * ============================================================
 */
router.post(
  "/class-subjects",
  authenticate,
  requireRole([Role.ADMIN]),
  async (req, res) => {
    const { classId, subjectId } = req.body;

    if (!classId || !subjectId) {
      return res.status(400).json({ message: "classId and subjectId required" });
    }

    const link = await prisma.classSubject.create({
      data: { classId, subjectId },
    });

    res.status(201).json(link);
  }
);

/**
 * ============================================================
 * ADMIN — LIST CLASS ↔ SUBJECT ASSIGNMENTS
 * GET /api/admin/class-subjects
 * ============================================================
 */
router.get(
  "/class-subjects",
  authenticate,
  requireRole([Role.ADMIN]),
  async (_req, res) => {
    const data = await prisma.classSubject.findMany({
      include: {
        class: true,
        subject: true,
      },
      orderBy: {
        id: "desc",
      },
    });

    res.json(data);
  }
);

export default router;
