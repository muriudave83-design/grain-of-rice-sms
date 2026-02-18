// backend/src/routes/dashboardRoutes.ts
import { Router } from "express";
import {
  healthCheck,
  teacherDashboard,
  adminDashboard,
  listAllStudents,
  listAllSubjects,
} from "../controllers/dashboardController";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";
import { exportStudentsCSV } from "../controllers/adminController";  

const router = Router();

router.get("/health", healthCheck);

// Teacher dashboard (teachers + admin allowed)
router.get("/teacher", authenticate, requireRole([Role.TEACHER]), teacherDashboard);

// Admin dashboard (admins only)
router.get("/admin", authenticate, requireRole([Role.ADMIN]), adminDashboard);

// Admin-only student list
router.get("/students", authenticate, requireRole([Role.ADMIN]), listAllStudents);

// Export students CSV (admin only)
router.get(
  "/admin/export/students.csv",
  authenticate,
  requireRole([Role.ADMIN]),
  exportStudentsCSV
);

// Subjects (publicish - any authenticated user can view)
router.get("/subjects", authenticate, listAllSubjects);

export default router;
