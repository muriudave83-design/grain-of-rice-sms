import { Router } from "express";
import { prisma } from "../../prisma/client";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rolesMiddleware";
import { Role, Prisma } from "@prisma/client";

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
    try {
      const subjects = await prisma.subject.findMany({
        include: {
          teacher: true,
        },
        orderBy: { createdAt: "desc" },
      });

      res.json(subjects);
    } catch (error) {
      console.error("FETCH SUBJECTS ERROR:", error);
      res.status(500).json({ error: "Failed to fetch subjects" });
    }
  }
);

/**
 * ============================================================
 * ADMIN — CREATE SUBJECT (FIXED ✅)
 * POST /api/admin/subjects
 * ============================================================
 */
router.post(
  "/subjects",
  authenticate,
  requireRole([Role.ADMIN]),
  async (req, res) => {
    try {
      const { name, code } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Subject name required" });
      }

      // ✅ PREVENT DUPLICATE SUBJECT NAMES
      const existing = await prisma.subject.findFirst({
        where: {
          name: name,
        },
      });

      if (existing) {
        return res.status(400).json({
          error: "Subject already exists",
        });
      }

      const subject = await prisma.subject.create({
        data: {
          name,
          code: code || null,
        },
      });

      res.status(201).json(subject);
    } catch (error: any) {
      console.error("CREATE SUBJECT ERROR:", error);

      // ✅ HANDLE UNIQUE CONSTRAINT (if still exists anywhere)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return res.status(400).json({
          error: "Subject with this code already exists",
        });
      }

      res.status(500).json({
        error: "Failed to create subject",
      });
    }
  }
);

/**
 * ============================================================
 * ADMIN — ASSIGN TEACHER TO SUBJECT
 * PUT /api/admin/subjects/:id/assign-teacher
 * ============================================================
 */
router.put(
  "/subjects/:id/assign-teacher",
  authenticate,
  requireRole([Role.ADMIN]),
  async (req, res) => {
    try {
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
    } catch (error) {
      console.error("ASSIGN TEACHER ERROR:", error);
      res.status(500).json({ error: "Failed to assign teacher" });
    }
  }
);

export default router;