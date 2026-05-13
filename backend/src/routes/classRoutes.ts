import express from "express";
import { getStudentsByClass } from "../controllers/classController";
import { authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/:id/students", authenticate, getStudentsByClass);

export default router;