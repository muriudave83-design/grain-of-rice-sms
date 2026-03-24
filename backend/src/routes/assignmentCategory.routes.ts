import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import {
  listAssignmentCategories,
  createAssignmentCategory,
  updateAssignmentCategory,
} from "../controllers/assignmentCategory.controller";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";
import prisma from "../prisma"; // ✅ make sure this path is correct

const router = Router();

router.get("/", authenticate, listAssignmentCategories);

router.post(
  "/",
  authenticate,
  requireRole([Role.ADMIN]),
  createAssignmentCategory
);

router.put(
  "/:id",
  authenticate,
  requireRole([Role.ADMIN]),
  updateAssignmentCategory
);

// ✅ DELETE CATEGORY (SAFE)
router.delete(
  "/:id",
  authenticate,
  requireRole([Role.ADMIN]),
  async (req, res) => {
    const { id } = req.params;

    try {
      const categoryId = Number(id);

      // ✅ CHECK: used in assessments
      const inUse = await prisma.assessment.count({
        where: {
          categoryId: categoryId,
        },
      });

      if (inUse > 0) {
        return res.status(400).json({
          message:
            "Cannot delete category: it is used in one or more assessments.",
        });
      }

      // ✅ delete safely
      await prisma.assignmentCategory.delete({
        where: { id: categoryId },
      });

      res.json({ message: "Category deleted" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  }
);

export default router;