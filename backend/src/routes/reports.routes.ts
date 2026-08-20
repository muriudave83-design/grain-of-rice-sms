import express from "express";
import {
  getStudentReport,
  saveReportComment
} from "../controllers/reports.controller";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";

const router = express.Router();

// existing
router.get(
  "/student/:studentId",
  authenticate,
  requireRole(["ADMIN", "TEACHER", "STUDENT", "PARENT"]),
  getStudentReport
);

// 🔥 ADD THIS
router.post(
  "/report-comment",
  authenticate,
  requireRole(["TEACHER"]),
  saveReportComment
);

export default router;
