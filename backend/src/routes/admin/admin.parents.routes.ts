import { Router } from "express";
import { createParent } from "../../controllers/adminController";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rolesMiddleware";

const router = Router();

router.post(
  "/",
  authenticate,
  requireRole(["ADMIN"]),
  createParent
);

export default router;