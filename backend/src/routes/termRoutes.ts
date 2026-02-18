import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { getTerms, createTerm } from "../controllers/termController";

const router = Router();

router.get(
  "/",
  authenticate,
  requireRole(["ADMIN"]),
  getTerms
);

router.post(
  "/",
  authenticate,
  requireRole(["ADMIN"]),
  createTerm
);

export default router;
