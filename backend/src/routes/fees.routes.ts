import { Router } from "express";
import {
  getFees,
  createFee,
  payFee,
  deleteFee,
  updateFee, // ✅ added
} from "../controllers/fees.controller";

const router = Router();

router.get("/", getFees);
router.post("/", createFee);
router.put("/:id/pay", payFee);
router.put("/:id", updateFee);

// 🔥 DELETE FEE
router.delete("/:id", deleteFee);

export default router;