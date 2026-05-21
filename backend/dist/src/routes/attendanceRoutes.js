"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const ownershipMiddleware_1 = require("../middlewares/ownershipMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const client_1 = require("@prisma/client");
const createAttendanceSession_controller_1 = require("../controllers/attendance/createAttendanceSession.controller");
const submitAttendanceSession_controller_1 = require("../controllers/attendance/submitAttendanceSession.controller");
const getAttendanceSession_controller_1 = require("../controllers/attendance/getAttendanceSession.controller");
const saveAttendanceRecords_controller_1 = require("../controllers/attendance/saveAttendanceRecords.controller");
const getAttendanceByClass_controller_1 = require("../controllers/attendance/getAttendanceByClass.controller");
const getParentAttendanceSummary_controller_1 = require("../controllers/attendance/getParentAttendanceSummary.controller");
const attendance_controller_1 = require("../controllers/attendance.controller");
const getTodaySession_controller_1 = require("../controllers/attendance/getTodaySession.controller");
const getClassAttendance_controller_1 = require("../controllers/attendance/getClassAttendance.controller");
const router = (0, express_1.Router)();
/* =========================================================
   ASYNC HANDLER
========================================================= */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
/* =========================================================
   TEACHER / ATTENDANCE OFFICER OPERATIONS (WRITE ACCESS)
========================================================= */
// CREATE attendance session
router.post("/sessions", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_1.Role.TEACHER, client_1.Role.ATTENDANCE_OFFICER]), asyncHandler(async (req, res) => {
    try {
        return await (0, createAttendanceSession_controller_1.createAttendanceSession)(req, res);
    }
    catch (err) {
        console.error("Create attendance session error:", err);
        return res.status(500).json({
            message: "Failed to create attendance session",
        });
    }
}));
// SUBMIT attendance session
router.post("/sessions/:id/submit", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_1.Role.TEACHER, client_1.Role.ATTENDANCE_OFFICER]), asyncHandler(async (req, res) => {
    try {
        return await (0, submitAttendanceSession_controller_1.submitAttendanceSession)(req, res);
    }
    catch (err) {
        console.error("Submit attendance error:", err);
        return res.status(500).json({
            message: "Failed to submit attendance session",
        });
    }
}));
// SAVE attendance records
router.post("/sessions/:id/records", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_1.Role.TEACHER, client_1.Role.ATTENDANCE_OFFICER]), asyncHandler(async (req, res) => {
    try {
        return await (0, saveAttendanceRecords_controller_1.saveAttendanceRecords)(req, res);
    }
    catch (err) {
        console.error("Save attendance error:", err);
        return res.status(500).json({
            message: "Failed to save attendance records",
        });
    }
}));
/* =========================================================
   GENERAL ATTENDANCE ACCESS (TEACHER / OFFICER / ADMIN)
========================================================= */
// GET today's session for a class
router.get("/sessions/today/:classId", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_1.Role.TEACHER, client_1.Role.ATTENDANCE_OFFICER, client_1.Role.ADMIN]), asyncHandler(async (req, res) => {
    try {
        return await (0, getTodaySession_controller_1.getTodaySession)(req, res);
    }
    catch (err) {
        console.error("Get today session error:", err);
        return res.status(500).json({
            message: "Could not fetch today's session",
        });
    }
}));
// GET session details
router.get("/sessions/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_1.Role.TEACHER, client_1.Role.ATTENDANCE_OFFICER, client_1.Role.ADMIN]), asyncHandler(async (req, res) => {
    try {
        return await (0, getAttendanceSession_controller_1.getAttendanceSession)(req, res);
    }
    catch (err) {
        console.error("Get session error:", err);
        return res.status(500).json({
            message: "Could not load session",
        });
    }
}));
// GET attendance by class
// Standardized route naming
router.get("/class/:classId/attendance", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_1.Role.TEACHER, client_1.Role.ATTENDANCE_OFFICER, client_1.Role.ADMIN]), asyncHandler(async (req, res) => {
    try {
        return await (0, getAttendanceByClass_controller_1.getAttendanceByClass)(req, res);
    }
    catch (err) {
        console.error("Get class attendance error:", err);
        return res.status(500).json({
            message: "Could not load class attendance",
        });
    }
}));
// ADMIN CLASS ATTENDANCE
router.get("/class/:classId", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_1.Role.ADMIN]), asyncHandler(async (req, res) => {
    try {
        return await (0, getClassAttendance_controller_1.getClassAttendance)(req, res);
    }
    catch (err) {
        console.error("Admin class attendance error:", err);
        return res.status(500).json({
            message: "Could not load admin class attendance",
        });
    }
}));
/* =========================================================
   ADMIN REPORTING
========================================================= */
// ATTENDANCE REPORT
router.get("/report", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([
    client_1.Role.ADMIN,
    client_1.Role.TEACHER,
    client_1.Role.ATTENDANCE_OFFICER,
]), asyncHandler(async (req, res) => {
    try {
        return await (0, attendance_controller_1.getAttendanceReport)(req, res);
    }
    catch (err) {
        console.error("Attendance report error:", err);
        return res.status(500).json({
            message: "Could not generate attendance report",
        });
    }
}));
/* =========================================================
   STUDENT ACCESS
========================================================= */
// STUDENT attendance summary
router.get("/student", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_1.Role.STUDENT]), asyncHandler(async (req, res) => {
    try {
        return await (0, attendance_controller_1.getStudentAttendanceSummary)(req, res);
    }
    catch (err) {
        console.error("Student attendance error:", err);
        return res.status(500).json({
            message: "Could not load student attendance",
        });
    }
}));
// STUDENT ABSENCE COUNT (also usable by admin)
router.get("/student-absence", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_1.Role.STUDENT, client_1.Role.ADMIN]), asyncHandler(async (req, res) => {
    try {
        return await (0, attendance_controller_1.getStudentAbsenceCount)(req, res);
    }
    catch (err) {
        console.error("Student absence count error:", err);
        return res.status(500).json({
            message: "Could not fetch student absence count",
        });
    }
}));
/* =========================================================
   PARENT ACCESS
========================================================= */
// PARENT all children attendance
router.get("/parent", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_1.Role.PARENT]), asyncHandler(async (req, res) => {
    try {
        return await (0, attendance_controller_1.getParentAttendance)(req, res);
    }
    catch (err) {
        console.error("Parent attendance error:", err);
        return res.status(500).json({
            message: "Could not load parent attendance",
        });
    }
}));
// PARENT student summary
router.get("/parent/students/:studentId/summary", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_1.Role.PARENT]), ownershipMiddleware_1.authorizeStudentAccess, asyncHandler(async (req, res) => {
    try {
        return await (0, getParentAttendanceSummary_controller_1.getParentAttendanceSummary)(req, res);
    }
    catch (err) {
        console.error("Parent summary error:", err);
        return res.status(500).json({
            message: "Could not load parent summary",
        });
    }
}));
exports.default = router;
