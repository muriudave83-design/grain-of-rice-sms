import { Router } from "express";
import {
  getSponsorships,
  createSponsorship,
  deleteSponsorship,
  updateSponsorship, // ✅ ADD THIS
} from "../controllers/sponsorship.controller";

const router = Router();

router.get("/", getSponsorships);
router.post("/", createSponsorship);
router.delete("/:id", deleteSponsorship);
router.put("/:id", updateSponsorship);

export default router;