import { Router } from "express";
import { getReportCardPdf } from "../controllers/reportCardPdf.controller";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

// GET /api/report-cards/:id/pdf
router.get(
  "/report-cards/:id/pdf",
  authenticate,
  getReportCardPdf
);

export default router;
