"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const ownershipMiddleware_1 = require("../middlewares/ownershipMiddleware");
const createAttendanceSession_controller_1 = require("../controllers/attendance/createAttendanceSession.controller");
const submitAttendanceSession_controller_1 = require("../controllers/attendance/submitAttendanceSession.controller");
const getAttendanceSession_controller_1 = require("../controllers/attendance/getAttendanceSession.controller");
const saveAttendanceRecords_controller_1 = require("../controllers/attendance/saveAttendanceRecords.controller");
const getAttendanceByClass_controller_1 = require("../controllers/attendance/getAttendanceByClass.controller");
const getParentAttendanceSummary_controller_1 = require("../controllers/attendance/getParentAttendanceSummary.controller");
const attendance_controller_1 = require("../controllers/attendance.controller");
const router = (0, express_1.Router)();
// ------------------------------------------------------
// CREATE attendance session
// ------------------------------------------------------
router.post("/sessions", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["TEACHER"]), createAttendanceSession_controller_1.createAttendanceSession);
// ------------------------------------------------------
// SUBMIT attendance session (LOCKS IT)
// ------------------------------------------------------
router.post("/sessions/:id/submit", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["TEACHER"]), submitAttendanceSession_controller_1.submitAttendanceSession);
// ------------------------------------------------------
// GET session details + students
// ------------------------------------------------------
router.get("/sessions/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["TEACHER", "ADMIN"]), getAttendanceSession_controller_1.getAttendanceSession);
// ------------------------------------------------------
// SAVE attendance records
// ------------------------------------------------------
router.post("/sessions/:id/records", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["TEACHER"]), saveAttendanceRecords_controller_1.saveAttendanceRecords);
// ------------------------------------------------------
// GET attendance by class
// ------------------------------------------------------
router.get("/classes/:classId", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["TEACHER", "ADMIN"]), getAttendanceByClass_controller_1.getAttendanceByClass);
// ------------------------------------------------------
// PARENT — Attendance summary for a child (READ-ONLY)
// ------------------------------------------------------
router.get("/parent/students/:studentId/summary", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["PARENT", "ADMIN"]), ownershipMiddleware_1.authorizeStudentAccess, getParentAttendanceSummary_controller_1.getParentAttendanceSummary);
// ------------------------------------------------------
// PARENT — Attendance for all own children
// GET /api/attendance/parent
// ------------------------------------------------------
router.get("/parent", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["PARENT"]), attendance_controller_1.getParentAttendance);
exports.default = router;
