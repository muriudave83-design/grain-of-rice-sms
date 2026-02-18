import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import {
  listClassSubjects,
  createClassSubject,
} from "../controllers/classSubject.controller";

const router = Router();

router.use(authenticate, requireRole(["ADMIN"]));

router.get("/", listClassSubjects);
router.post("/", createClassSubject);

export default router;
