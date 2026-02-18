import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { listAssignmentCategories } from "../controllers/assignmentCategory.controller";

const router = Router();

router.get("/", authenticate, listAssignmentCategories);

export default router;
