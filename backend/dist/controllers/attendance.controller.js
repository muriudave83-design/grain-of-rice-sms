"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParentAttendance = exports.AttendanceController = void 0;
const client_1 = require("../prisma/client");
const attendanceSession_service_1 = require("../services/attendance/attendanceSession.service");
class AttendanceController {
    static async submitSession(req, res) {
        try {
            const sessionId = Number(req.params.id);
            const user = req.user;
            if (!user) {
                return res.status(401).json({ message: "Not authenticated" });
            }
            const teacherId = user.id;
            const session = await attendanceSession_service_1.AttendanceSessionService.submitSession(sessionId, teacherId);
            res.json(session);
        }
        catch (err) {
            res.status(err.status || 500).json({
                message: err.message || "Server error",
            });
        }
    }
}
exports.AttendanceController = AttendanceController;
/**
 * ============================================================
 * PARENT — GET ATTENDANCE FOR ALL OWN CHILDREN
 * GET /api/attendance/parent
 * ============================================================
 */
const getParentAttendance = async (req, res) => {
    try {
        const parentId = req.user.id;
        // 1. Get linked students
        const links = await client_1.prisma.parentStudent.findMany({
            where: { parentId },
            select: { studentId: true },
        });
        const studentIds = links.map((l) => l.studentId);
        if (studentIds.length === 0) {
            return res.json([]);
        }
        // 2. Get attendance entries
        const entries = await client_1.prisma.attendanceEntry.findMany({
            where: {
                studentId: { in: studentIds },
            },
            include: {
                session: {
                    include: {
                        class: true,
                    },
                },
                student: true,
            },
            orderBy: {
                id: "desc",
            },
        });
        res.json(entries);
    }
    catch (err) {
        console.error("getParentAttendance error:", err);
        res.status(500).json({ message: "Failed to fetch attendance" });
    }
};
exports.getParentAttendance = getParentAttendance;
