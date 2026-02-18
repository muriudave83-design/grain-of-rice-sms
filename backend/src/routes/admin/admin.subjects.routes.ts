import { Router } from "express";
import { prisma } from "../../prisma/client";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";

const router = Router();

/**
 * ============================================================
 * ADMIN — LIST SUBJECTS
 * GET /api/admin/subjects
 * ============================================================
 */
router.get(
  "/subjects",
  authenticate,
  requireRole([Role.ADMIN]),
  async (_req, res) => {
    const subjects = await prisma.subject.findMany({
      include: {
        teacher: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(subjects);
  }
);

/**
 * ============================================================
 * ADMIN — CREATE SUBJECT
 * POST /api/admin/subjects
 * ============================================================
 */
router.post(
  "/subjects",
  authenticate,
  requireRole([Role.ADMIN]),
  async (req, res) => {
    const { name, code } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Subject name required" });
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        code: code || null,
      },
    });

    res.status(201).json(subject);
  }
);

/**
 * ============================================================
 * ✅ ADMIN — ASSIGN TEACHER TO SUBJECT (CRITICAL FIX)
 * PUT /api/admin/subjects/:id/assign-teacher
 * ============================================================
 */
router.put(
  "/subjects/:id/assign-teacher",
  authenticate,
  requireRole([Role.ADMIN]),
  async (req, res) => {
    const subjectId = Number(req.params.id);
    const { teacherId } = req.body;

    if (!teacherId) {
      return res.status(400).json({ message: "teacherId required" });
    }

    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
    });

    if (!teacher || teacher.role !== Role.TEACHER) {
      return res.status(400).json({ message: "Invalid teacher" });
    }

    const updated = await prisma.subject.update({
      where: { id: subjectId },
      data: { teacherId },
    });

    res.json(updated);
  }
);

export default router;
