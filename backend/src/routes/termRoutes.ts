import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { getTerms, createTerm } from "../controllers/termController";

const router = Router();

/**
 * GET /api/terms
 * Get all terms
 * Access: ADMIN only
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

export default router;