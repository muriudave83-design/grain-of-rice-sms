import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import {
  listAssignmentCategories,
  createAssignmentCategory,
  updateAssignmentCategory,
} from "../controllers/assignmentCategory.controller";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";

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

export default router;