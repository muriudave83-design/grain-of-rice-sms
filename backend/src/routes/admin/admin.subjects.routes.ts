import { Router } from "express";
import { prisma } from "../../prisma/client";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rolesMiddleware";
import { Role, Prisma } from "@prisma/client";

const router = Router();

/**
 * ============================================================
 * ADMIN — LIST SUBJECTS (UPDATED ✅ SEARCH + HIDE ARCHIVED)
 * GET /api/admin/subjects
 * ============================================================
 */
router.get(
  "/subjects",
  authenticate,
  requireRole([Role.ADMIN]),
  async (req, res) => {
    try {
      const { search } = req.query;

      const subjects = await prisma.subject.findMany({
        where: {
          isArchived: false,
          ...(search && {
            OR: [
              {
                name: {
                  contains: String(search),
                  mode: "insensitive",
                },
              },
              {
                code: {
                  contains: String(search),
                  mode: "insensitive",
                },
              },
            ],
          }),
        },
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
 * ADMIN — CREATE SUBJECT
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
 * ADMIN — EDIT SUBJECT ✅ NEW
 * PATCH /api/admin/subjects/:id
 * ============================================================
 */
router.patch(
  "/subjects/:id",
  authenticate,
  requireRole([Role.ADMIN]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, code } = req.body;

      const updated = await prisma.subject.update({
        where: { id: Number(id) },
        data: { name, code },
      });

      res.json(updated);
    } catch (error) {
      console.error("UPDATE SUBJECT ERROR:", error);
      res.status(500).json({ error: "Failed to update subject" });
    }
  }
);

/**
 * ============================================================
 * ADMIN — ARCHIVE SUBJECT ✅ NEW
 * PATCH /api/admin/subjects/:id/archive
 * ============================================================
 */
router.patch(
  "/subjects/:id/archive",
  authenticate,
  requireRole([Role.ADMIN]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const archived = await prisma.subject.update({
        where: { id: Number(id) },
        data: { isArchived: true },
      });

      res.json({ message: "Subject archived", archived });
    } catch (error) {
      console.error("ARCHIVE SUBJECT ERROR:", error);
      res.status(500).json({ error: "Failed to archive subject" });
    }
  }
);

export default router;
