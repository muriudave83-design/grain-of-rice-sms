import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { authorizeStudentAccess } from "../middlewares/ownershipMiddleware";

import { createAttendanceSession } from "../controllers/attendance/createAttendanceSession.controller";
import { submitAttendanceSession } from "../controllers/attendance/submitAttendanceSession.controller";
import { getAttendanceSession } from "../controllers/attendance/getAttendanceSession.controller";
import { saveAttendanceRecords } from "../controllers/attendance/saveAttendanceRecords.controller";
import { getAttendanceByClass } from "../controllers/attendance/getAttendanceByClass.controller";
import { getParentAttendanceSummary } from "../controllers/attendance/getParentAttendanceSummary.controller";
import { getParentAttendance, getStudentAttendanceSummary } from "../controllers/attendance.controller";

const router = Router();

// ------------------------------------------------------
// CREATE attendance session
// ------------------------------------------------------
router.post(
  "/sessions",
  authenticate,
  requireRole(["TEACHER"]),
  createAttendanceSession
);

// ------------------------------------------------------
// SUBMIT attendance session (LOCKS IT)
// ------------------------------------------------------
router.post(
  "/sessions/:id/submit",
  authenticate,
  requireRole(["TEACHER"]),
  submitAttendanceSession
);

// ------------------------------------------------------
// GET session details + students
// ------------------------------------------------------
router.get(
  "/sessions/:id",
  authenticate,
  requireRole(["TEACHER", "ADMIN"]),
  getAttendanceSession
);

// ------------------------------------------------------
// SAVE attendance records
// ------------------------------------------------------
router.post(
  "/sessions/:id/records",
  authenticate,
  requireRole(["TEACHER"]),
  saveAttendanceRecords
);

// ------------------------------------------------------
// GET attendance by class
// ------------------------------------------------------
router.get(
  "/classes/:classId",
  authenticate,
  requireRole(["TEACHER", "ADMIN"]),
  getAttendanceByClass
);

// ------------------------------------------------------
// STUDENT — Attendance summary (NEW)
// GET /api/attendance/student
// ------------------------------------------------------
router.get(
  "/student",
  authenticate,
  requireRole(["STUDENT"]),
  getStudentAttendanceSummary
);

// ------------------------------------------------------
// PARENT — Attendance summary for a child (READ-ONLY)
// ------------------------------------------------------
router.get(
  "/parent/students/:studentId/summary",
  authenticate,
  requireRole(["PARENT", "ADMIN"]),
  authorizeStudentAccess,
  getParentAttendanceSummary
);

// ------------------------------------------------------
// PARENT — Attendance for all own children
// GET /api/attendance/parent
// ------------------------------------------------------
router.get(
  "/parent",
  authenticate,
  requireRole(["PARENT"]),
  getParentAttendance
);

export default router;
