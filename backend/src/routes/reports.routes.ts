import express from "express";
import {
  getStudentReport,
  saveReportComment
} from "../controllers/reports.controller";

const router = express.Router();

// existing
router.get("/student/:studentId", getStudentReport);

// 🔥 ADD THIS
router.post("/report-comment", saveReportComment);

export default router;