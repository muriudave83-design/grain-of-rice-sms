import { Router } from "express";
import {
  createParent,
  getParents,
  updateParent,
  archiveParent, // 👈 ADDED
} from "../../controllers/adminController";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rolesMiddleware";

const router = Router();

// ✅ CREATE
router.post(
  "/",
  authenticate,
  requireRole(["ADMIN"]),
  createParent
);

// ✅ GET ALL
router.get(
  "/",
  authenticate,
  requireRole(["ADMIN"]),
  getParents
);

// ✅ UPDATE
router.patch(
  "/:id",
  authenticate,
  requireRole(["ADMIN"]),
  updateParent
);

// ✅ ARCHIVE (DEACTIVATE)
router.patch(
  "/:id/archive",
  authenticate,
  requireRole(["ADMIN"]),
  archiveParent
);

export default router;