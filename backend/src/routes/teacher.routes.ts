import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import {
  getTeacherSubjects,
  getTeacherClasses,
  getGradebook,
  upsertScore,
  createAssignment,      // ✅ ADDED
  deleteAssignment,      // ✅ ADDED
  updateAssignment,      // ✅ ADDED
} from "../controllers/teacher.controller";

const router = Router();

router.use(authenticate, requireRole(["TEACHER"]));

// ✅ GET teacher classes
router.get("/classes", getTeacherClasses);

// ✅ GET teacher subjects
router.get("/subjects", getTeacherSubjects);

// ✅ GET gradebook detail
router.get("/gradebook/:id", getGradebook);

// ✅ POST score (create/update)
router.post("/score", upsertScore);

//
// 🧱 PHASE 5 — ASSIGNMENTS
//

// ✅ CREATE assignment
router.post("/assignment", createAssignment);

// ✅ DELETE assignment
router.delete("/assignment/:id", deleteAssignment);

// ✅ UPDATE (rename) assignment
router.put("/assignment/:id", updateAssignment);

export default router;