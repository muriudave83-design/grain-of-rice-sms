"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAttendanceSession = createAttendanceSession;
const attendanceSession_service_1 = require("../../services/attendance/attendanceSession.service");
async function createAttendanceSession(req, res) {
    try {
        const teacherId = req.user.id;
        const { classId } = req.body;
        if (!classId) {
            return res.status(400).json({ message: "classId is required" });
        }
        const session = await attendanceSession_service_1.AttendanceSessionService.createSession({
            classId: Number(classId),
            teacherId,
            date: new Date(),
        });
        return res.status(201).json(session);
    }
    catch (error) {
        return res
            .status(error.status || 500)
            .json({ message: error.message || "Failed to create attendance session" });
    }
}
