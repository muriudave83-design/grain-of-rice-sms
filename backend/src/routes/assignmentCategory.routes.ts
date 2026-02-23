import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import {
  listAssignmentCategories,
  createAssignmentCategory,
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

export default router;
