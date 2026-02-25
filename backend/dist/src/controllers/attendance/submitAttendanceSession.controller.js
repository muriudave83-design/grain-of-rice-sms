"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitAttendanceSession = submitAttendanceSession;
const attendanceSession_service_1 = require("../../services/attendance/attendanceSession.service");
async function submitAttendanceSession(req, res) {
    try {
        const teacherId = req.user.id;
        const sessionId = Number(req.params.id);
        if (!sessionId) {
            return res.status(400).json({ message: "Invalid session id" });
        }
        const session = await attendanceSession_service_1.AttendanceSessionService.submitSession(sessionId, teacherId);
        return res.json(session);
    }
    catch (error) {
        return res
            .status(error.status || 500)
            .json({ message: error.message || "Failed to submit attendance" });
    }
}
