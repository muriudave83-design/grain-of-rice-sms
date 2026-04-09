import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";

import {
  createParent,
  getParents,
  getParentById,
  updateParent,
  archiveParent,
  linkStudentToParent,
  unlinkStudentFromParent, // 🔥 NEW IMPORT
} from "../controllers/adminController";

const router = Router();

/**
 * 👪 GET ALL PARENTS
 * GET /api/admin/parents
 */
router.get(
  "/parents",
  authenticate,
  requireRole(["ADMIN"]),
  getParents
);

/**
 * 👪 CREATE PARENT
 * POST /api/admin/parents
 */
router.post(
  "/parents",
  authenticate,
  requireRole(["ADMIN"]),
  createParent
);

/**
 * 👪 GET SINGLE PARENT
 */
router.get(
  "/parents/:id",
  authenticate,
  requireRole(["ADMIN"]),
  getParentById
);

/**
 * 👪 UPDATE PARENT
 */
router.put(
  "/parents/:id",
  authenticate,
  requireRole(["ADMIN"]),
  updateParent
);

/**
 * 👪 DELETE / ARCHIVE PARENT
 */
router.delete(
  "/parents/:id",
  authenticate,
  requireRole(["ADMIN"]),
  archiveParent
);

/**
 * 🔗 LINK STUDENT TO PARENT
 * POST /api/admin/link-student
 */
router.post(
  "/link-student",
  authenticate,
  requireRole(["ADMIN"]),
  linkStudentToParent
);

/**
 * ❌ UNLINK STUDENT FROM PARENT (🔥 NEW)
 * DELETE /api/admin/unlink-student
 */
router.delete(
  "/unlink-student",
  authenticate,
  requireRole(["ADMIN"]),
  unlinkStudentFromParent
);

export default router;