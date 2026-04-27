import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { getTerms, createTerm, toggleTermLock } from "../controllers/termController";

const router = Router();

/**
 * GET /api/terms
 * Get all terms
 * Access: ADMIN + TEACHER
 */
router.get(
  "/",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  getTerms
);

/**
 * POST /api/terms
 * Create new term
 * Access: ADMIN only
 */
router.post(
  "/",
  authenticate,
  requireRole(["ADMIN"]),
  createTerm
);

/**
 * PUT /api/terms/:id/lock
 * Toggle term lock
 * Access: ADMIN only
 */
router.put(
  "/:id/lock",
  authenticate,
  requireRole(["ADMIN"]),
  toggleTermLock
);

export default router;