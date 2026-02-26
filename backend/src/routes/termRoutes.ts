import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/rolesMiddleware.js";
import { getTerms, createTerm } from "../controllers/termController.js";

const router = Router();

/**
 * GET /api/terms
 * Get all terms
 * Access: ADMIN only
 */
router.get(
  "/",
  authenticate,
  requireRole(["ADMIN"]),
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