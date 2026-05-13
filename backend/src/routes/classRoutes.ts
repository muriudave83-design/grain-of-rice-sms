import express from "express";
import { getStudentsByClass } from "../controllers/classController";
import { requireAuth } from "../middlewares/requireAuth";

const router = express.Router();

router.get("/:id/students", requireAuth, getStudentsByClass);

export default router;