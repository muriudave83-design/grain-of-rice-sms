"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttendanceByClass = void 0;
const attendanceSession_service_1 = require("../../services/attendance/attendanceSession.service");
const getAttendanceByClass = async (req, res) => {
    try {
        const classId = Number(req.params.classId);
        if (Number.isNaN(classId)) {
            return res.status(400).json({ message: 'Invalid classId' });
        }
        const sessions = await attendanceSession_service_1.AttendanceSessionService.getByClass({
            classId,
            requester: {
                role: req.user.role,
                teacherId: req.user.id,
            },
        });
        res.json(sessions);
    }
    catch (err) {
        res.status(err.status || 500).json({
            message: err.message || 'Failed to fetch attendance',
        });
    }
};
exports.getAttendanceByClass = getAttendanceByClass;
