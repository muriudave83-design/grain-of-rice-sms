import { Router } from "express";
import { prisma } from "../prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import {
  getTerms,
  createTerm,
  toggleTermLock,
  updateTerm,
  deleteTerm,
} from "../controllers/termController";

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
 * VALIDATE TERM
 * GET /api/terms/validate
 */
router.get(
  "/validate",
  authenticate,
  async (req, res) => {
    try {
      const classId = Number(req.query.classId);
      const name = String(req.query.term);

      const term = await prisma.term.findFirst({
        where: {
          classId,
          name,
        },
      });

      // TERM NOT CONFIGURED
      if (!term) {
        return res.json({
          status: "missing",
          message: "This term has not been configured yet.",
        });
      }

      // TERM LOCKED
      if (term.isLocked) {
        return res.json({
          status: "locked",
          message: "This term is locked.",
        });
      }

      // VALID
      return res.json({
        status: "valid",
        message: "Term is active.",
        term,
      });

    } catch (error: any) {
      console.error(error);

      return res.status(500).json({
        message: "Failed to validate term",
      });
    }
  }
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

router.put(
  "/:id",
  authenticate,
  requireRole(["ADMIN"]),
  updateTerm
);

router.delete(
  "/:id",
  authenticate,
  requireRole(["ADMIN"]),
  deleteTerm
);

export default router;