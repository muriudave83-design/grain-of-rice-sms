import { Router } from "express";
import {
  getDiscipline,
  addDiscipline,
  deleteDiscipline,
  updateDiscipline, // ✅ ADD THIS
} from "../controllers/discipline.controller";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate, requireRole([Role.ADMIN]));

router.get("/", getDiscipline);
router.post("/", addDiscipline);
router.delete("/:id", deleteDiscipline);
router.put("/:id", updateDiscipline);

export default router;
