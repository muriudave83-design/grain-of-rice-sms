import { Router } from "express";
import { prisma } from "../prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";

const router = Router();

/**
 * ============================================================
 * ADMIN — LINK PARENT TO STUDENT
 * POST /api/parent-students
 * body: { parentId, studentId }
 * ============================================================
 */
router.post(
  "/",
  authenticate,
  requireRole([Role.ADMIN]),
  async (req, res) => {
    console.log("CREATE PARENT BODY:", req.body);

    const { parentId, studentId } = req.body;

    if (
      typeof parentId !== "number" ||
      typeof studentId !== "number"
    ) {
      return res.status(400).json({
        message: "parentId and studentId must be numbers",
      });
    }

    // ✅ Normalize ONCE
    const parentIdStr = String(parentId);

    // Prevent duplicate links
    const existing = await prisma.parentStudent.findFirst({
      where: { parentId: parentIdStr, studentId },
    });

    if (existing) {
      return res.status(400).json({
        message: "Parent already linked to this student",
      });
    }

    const link = await prisma.parentStudent.create({
      data: { parentId: parentIdStr, studentId },
    });

    res.json(link);
  }
);

/**
 * ============================================================
 * PARENT — GET LINKED STUDENTS (SELF)
 * GET /api/parent-students
 * ============================================================
 */
router.get(
  "/",
  authenticate,
  requireRole([Role.PARENT]),
  async (req, res) => {
    try {
      const user = (req as any).user;

      if (!user || user.role !== "PARENT") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const parentIdStr = String(user.id);

      const links = await prisma.parentStudent.findMany({
        where: { parentId: parentIdStr },
        include: {
          student: {
            include: {
              class: true,
            },
          },
        },
      });

      res.json(links);
    } catch (err) {
      console.error("Parent students fetch error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

/**
 * ============================================================
 * ADMIN — GET STUDENTS FOR A PARENT
 * GET /api/parent-students/:parentId
 * ============================================================
 */
router.get(
  "/:parentId",
  authenticate,
  requireRole([Role.ADMIN]),
  async (req, res) => {
    const parentId = req.params.parentId;

    try {
      const links = await prisma.parentStudent.findMany({
        where: { parentId: String(parentId) },
        include: {
          student: {
            include: {
              class: true,
            },
          },
        },
      });

      res.json(links);
    } catch (err) {
      console.error("Admin fetch parent students error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export { router as parentStudentRoutes };