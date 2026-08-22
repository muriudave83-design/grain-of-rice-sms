import { Router } from "express";
import { prisma } from "../../prisma/client";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rolesMiddleware";
import { deleteClassWithData, getClassDeletePreview } from "../../services/classDeletion.service";

const router = Router();

/**
 * ✅ POST /api/admin/classes
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
 * Supports archived toggle
 */
router.get(
  "/classes",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const includeArchived =
        req.query.includeArchived === "true";

      const classes = await prisma.class.findMany({
        where: includeArchived
          ? {}
          : { isArchived: false },

        orderBy: {
          createdAt: "asc",
        },

        include: {
          _count: {
            select: {
              students: true,
            },
          },
        },
      });

      // ✅ Normalize response
      const formatted = classes.map((cls) => ({
        ...cls,
        studentCount: cls._count.students,
      }));

      return res.json(formatted);
    } catch (error) {
      console.error("Fetch classes failed:", error);

      return res.status(500).json({
        message: "Failed to fetch classes",
      });
    }
  }
);

/**
 * ✏️ PUT /api/admin/classes/:id
 */
router.put(
  "/classes/:id",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          message: "Invalid class ID",
        });
      }

      if (!name || name.trim() === "") {
        return res.status(400).json({
          message: "Class name is required",
        });
      }

      const existing = await prisma.class.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({
          message: "Class not found",
        });
      }

      const updated = await prisma.class.update({
        where: { id },
        data: { name },
      });

      return res.json(updated);
    } catch (error) {
      console.error("Update class failed:", error);

      return res.status(500).json({
        message: "Failed to update class",
      });
    }
  }
);

/**
 * ✅ GET /api/admin/classes/:classId/students
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

      return res.json(students);
    } catch (error) {
      console.error("Fetch class students failed:", error);

      return res.status(500).json({
        message: "Failed to fetch students",
      });
    }
  }
);

/**
 * ❌ DELETE /api/admin/classes/:id
 */
router.get(
  "/classes/:id/delete-preview",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid class ID" });
    try {
      return res.json(await getClassDeletePreview(prisma, id));
    } catch (error: any) {
      return res.status(error?.status || 500).json({ message: error?.message || "Failed to preview class deletion" });
    }
  },
);

router.delete(
  "/classes/:id/with-data",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    const classId = Number(req.params.id);
    if (!Number.isInteger(classId) || classId <= 0) return res.status(400).json({ message: "Invalid class ID" });
    try {
      const preview = await deleteClassWithData(prisma, classId, req.body?.confirmation);
      return res.json({ message: "Class data permanently deleted", preview });
    } catch (error: any) {
      console.error("DELETE CLASS ERROR:", error);
      return res.status(error?.status || 500).json({
        message: error?.message || "Failed to delete class",
        ...(error?.preview ? { preview: error.preview } : {}),
      });
    }
  },
);

/**
 * 🗂️ PATCH /api/admin/classes/:id/archive
 */
router.patch(
  "/classes/:id/archive",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          message: "Invalid class ID",
        });
      }

      const existing = await prisma.class.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({
          message: "Class not found",
        });
      }

      await prisma.class.update({
        where: { id },
        data: {
          isArchived: true,
        },
      });

      return res.json({
        message: "Class archived successfully",
      });
    } catch (error) {
      console.error("Failed to archive class", error);

      return res.status(500).json({
        message: "Failed to archive class",
      });
    }
  }
);

export default router;
