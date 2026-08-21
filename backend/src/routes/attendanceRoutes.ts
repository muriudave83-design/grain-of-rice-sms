import { Router, RequestHandler } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { authorizeStudentAccess } from "../middlewares/ownershipMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";

import { createAttendanceSession } from "../controllers/attendance/createAttendanceSession.controller";
import { submitAttendanceSession } from "../controllers/attendance/submitAttendanceSession.controller";
import { getAttendanceSession } from "../controllers/attendance/getAttendanceSession.controller";
import { saveAttendanceRecords } from "../controllers/attendance/saveAttendanceRecords.controller";
import { getAttendanceByClass } from "../controllers/attendance/getAttendanceByClass.controller";
import { getParentAttendanceSummary } from "../controllers/attendance/getParentAttendanceSummary.controller";

import {
  getParentAttendance,
  getStudentAttendanceSummary,
  getAttendanceReport,
  getStudentAbsenceCount,
} from "../controllers/attendance.controller";

import { getTodaySession } from "../controllers/attendance/getTodaySession.controller";
import { getClassAttendance } from "../controllers/attendance/getClassAttendance.controller";
import {
  markAllPresent,
  markAttendance,
  startAfternoonAttendance,
} from "../controllers/attendance/markAttendance.controller";

const router = Router();

/* =========================================================
   ASYNC HANDLER
========================================================= */

const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

router.post(
  "/mark",
  authenticate,
  requireRole([Role.TEACHER, Role.ATTENDANCE_OFFICER, Role.ADMIN]),
  asyncHandler(markAttendance),
);
router.post(
  "/mark-all",
  authenticate,
  requireRole([Role.TEACHER, Role.ATTENDANCE_OFFICER, Role.ADMIN]),
  asyncHandler(markAllPresent),
);
router.post(
  "/class/:classId/start-afternoon",
  authenticate,
  requireRole([Role.TEACHER, Role.ATTENDANCE_OFFICER, Role.ADMIN]),
  asyncHandler(startAfternoonAttendance),
);

/* =========================================================
   TEACHER / ATTENDANCE OFFICER OPERATIONS (WRITE ACCESS)
========================================================= */

// CREATE attendance session
router.post(
  "/sessions",
  authenticate,
  requireRole([Role.TEACHER, Role.ATTENDANCE_OFFICER]),
  asyncHandler(async (req, res) => {
    try {
      return await createAttendanceSession(req, res);
    } catch (err) {
      console.error("Create attendance session error:", err);

      return res.status(500).json({
        message: "Failed to create attendance session",
      });
    }
  })
);

// SUBMIT attendance session
router.post(
  "/sessions/:id/submit",
  authenticate,
  requireRole([Role.TEACHER, Role.ATTENDANCE_OFFICER]),
  asyncHandler(async (req, res) => {
    try {
      return await submitAttendanceSession(req, res);
    } catch (err) {
      console.error("Submit attendance error:", err);

      return res.status(500).json({
        message: "Failed to submit attendance session",
      });
    }
  })
);

// SAVE attendance records
router.post(
  "/sessions/:id/records",
  authenticate,
  requireRole([Role.TEACHER, Role.ATTENDANCE_OFFICER]),
  asyncHandler(async (req, res) => {
    try {
      return await saveAttendanceRecords(req, res);
    } catch (err) {
      console.error("Save attendance error:", err);

      return res.status(500).json({
        message: "Failed to save attendance records",
      });
    }
  })
);

/* =========================================================
   GENERAL ATTENDANCE ACCESS (TEACHER / OFFICER / ADMIN)
========================================================= */

// GET today's session for a class
router.get(
  "/sessions/today/:classId",
  authenticate,
  requireRole([Role.TEACHER, Role.ATTENDANCE_OFFICER, Role.ADMIN]),
  asyncHandler(async (req, res) => {
    try {
      return await getTodaySession(req, res);
    } catch (err) {
      console.error("Get today session error:", err);

      return res.status(500).json({
        message: "Could not fetch today's session",
      });
    }
  })
);

// GET session details
router.get(
  "/sessions/:id",
  authenticate,
  requireRole([Role.TEACHER, Role.ATTENDANCE_OFFICER, Role.ADMIN]),
  asyncHandler(async (req, res) => {
    try {
      return await getAttendanceSession(req, res);
    } catch (err) {
      console.error("Get session error:", err);

      return res.status(500).json({
        message: "Could not load session",
      });
    }
  })
);

// GET attendance by class
// Standardized route naming
router.get(
  "/class/:classId/attendance",
  authenticate,
  requireRole([Role.TEACHER, Role.ATTENDANCE_OFFICER, Role.ADMIN]),
  asyncHandler(async (req, res) => {
    try {
      return await getAttendanceByClass(req, res);
    } catch (err) {
      console.error("Get class attendance error:", err);

      return res.status(500).json({
        message: "Could not load class attendance",
      });
    }
  })
);

// ADMIN CLASS ATTENDANCE
router.get(
  "/class/:classId",
  authenticate,
  requireRole([Role.ADMIN]),
  asyncHandler(async (req, res) => {
    try {
      return await getClassAttendance(req, res);
    } catch (err) {
      console.error("Admin class attendance error:", err);

      return res.status(500).json({
        message: "Could not load admin class attendance",
      });
    }
  })
);

/* =========================================================
   ADMIN REPORTING
========================================================= */

// ATTENDANCE REPORT
router.get(
  "/report",
  authenticate,
  requireRole([
    Role.ADMIN,
    Role.TEACHER,
    Role.ATTENDANCE_OFFICER,
  ]),
  asyncHandler(async (req, res) => {
    try {
      return await getAttendanceReport(req, res);
    } catch (err) {
      console.error("Attendance report error:", err);

      return res.status(500).json({
        message: "Could not generate attendance report",
      });
    }
  })
);

/* =========================================================
   STUDENT ACCESS
========================================================= */

// STUDENT attendance summary
router.get(
  "/student",
  authenticate,
  requireRole([Role.STUDENT]),
  asyncHandler(async (req, res) => {
    try {
      return await getStudentAttendanceSummary(req, res);
    } catch (err) {
      console.error("Student attendance error:", err);

      return res.status(500).json({
        message: "Could not load student attendance",
      });
    }
  })
);

// STUDENT ABSENCE COUNT (also usable by admin)
router.get(
  "/student-absence",
  authenticate,
  requireRole([Role.STUDENT, Role.ADMIN]),
  asyncHandler(async (req, res) => {
    try {
      return await getStudentAbsenceCount(req, res);
    } catch (err) {
      console.error("Student absence count error:", err);

      return res.status(500).json({
        message: "Could not fetch student absence count",
      });
    }
  })
);

/* =========================================================
   PARENT ACCESS
========================================================= */

// PARENT all children attendance
router.get(
  "/parent",
  authenticate,
  requireRole([Role.PARENT]),
  asyncHandler(async (req, res) => {
    try {
      return await getParentAttendance(req, res);
    } catch (err) {
      console.error("Parent attendance error:", err);

      return res.status(500).json({
        message: "Could not load parent attendance",
      });
    }
  })
);

// PARENT student summary
router.get(
  "/parent/students/:studentId/summary",
  authenticate,
  requireRole([Role.PARENT]),
  authorizeStudentAccess,
  asyncHandler(async (req, res) => {
    try {
      return await getParentAttendanceSummary(req, res);
    } catch (err) {
      console.error("Parent summary error:", err);

      return res.status(500).json({
        message: "Could not load parent summary",
      });
    }
  })
);

export default router;
