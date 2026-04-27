import { Router } from "express";
import {
  getDiscipline,
  addDiscipline,
  deleteDiscipline,
  updateDiscipline, // ✅ ADD THIS
} from "../controllers/discipline.controller";

const router = Router();

router.get("/", getDiscipline);
router.post("/", addDiscipline);
router.delete("/:id", deleteDiscipline);
router.put("/:id", updateDiscipline);

export default router;