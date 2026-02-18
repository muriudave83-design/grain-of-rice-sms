import { Router } from "express";
import { prisma } from "../../prisma/client";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rolesMiddleware";

const router = Router();

/**
 * ✅ POST /api/admin/classes
 * Create a new class
 */
router.post(
  "/classes",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const { name } = req.body;

      if (!name || name.trim() === "") {
        return res.status(400).json({
          message: "Class name is required",
        });
      }

      const existing = await prisma.class.findFirst({
        where: { name },
      });

      if (existing) {
        return res.status(409).json({
          message: "Class already exists",
        });
      }

      const schoolClass = await prisma.class.create({
        data: { name },
      });

      return res.status(201).json(schoolClass);
    } catch (error) {
      console.error("Create class failed:", error);
      return res.status(500).json({
        message: "Failed to create class",
      });
    }
  }
);

/**
 * ✅ GET /api/admin/classes
 * Fetch all classes
 */
router.get(
  "/classes",
  authenticate,
  requireRole(["ADMIN"]),
  async (_req, res) => {
    try {
      const classes = await prisma.class.findMany({
        orderBy: { createdAt: "asc" },
      });

      return res.json(classes);
    } catch (error) {
      console.error("Fetch classes failed:", error);
      return res.status(500).json({
        message: "Failed to fetch classes",
      });
    }
  }
);

/**
 * ✅ GET /api/admin/classes/:classId/students
 * Fetch students belonging to a specific class
 */
router.get(
  "/classes/:classId/students",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const classId = Number(req.params.classId);

      if (isNaN(classId)) {
        return res.status(400).json({
          message: "Invalid class ID",
        });
      }

      const cls = await prisma.class.findUnique({
        where: { id: classId },
      });

      if (!cls) {
        return res.status(404).json({
          message: "Class not found",
        });
      }

      const students = await prisma.student.findMany({
        where: { classId },
        include: {
          parentLinks: {
            include: {
              parent: true,
            },
          },
        },
      });

      // Return raw students array (matches your frontend)
      return res.json(students);
    } catch (error) {
      console.error("Fetch class students failed:", error);
      return res.status(500).json({
        message: "Failed to fetch students",
      });
    }
  }
);

export default router;
