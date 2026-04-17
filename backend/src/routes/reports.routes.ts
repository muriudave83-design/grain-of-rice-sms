import express from "express";
import { getStudentReport } from "../controllers/reports.controller";

const router = express.Router();

router.get("/student/:studentId", getStudentReport);

export default router;