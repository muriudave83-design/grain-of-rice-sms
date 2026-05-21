"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentAbsenceCount = exports.getParentAttendance = exports.getStudentAttendanceSummary = exports.getAttendanceReport = exports.AttendanceController = void 0;
const client_1 = require("../prisma/client");
const attendanceSession_service_1 = require("../services/attendance/attendanceSession.service");
class AttendanceController {
    static async submitSession(req, res) {
        try {
            const sessionId = Number(req.params.id);
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    message: "Not authenticated",
                });
            }
            // RBAC handled in middleware
            const teacherId = user.id;
            const session = await attendanceSession_service_1.AttendanceSessionService.submitSession(sessionId, teacherId);
            return res.json(session);
        }
        catch (error) {
            console.error("submitSession error:", error);
            const err = error;
            return res.status(err.status || 500).json({
                message: err.message || "Server error",
            });
        }
    }
}
exports.AttendanceController = AttendanceController;
/**
 * ============================================================
 * ATTENDANCE REPORT (ADMIN / INSPECTION)
 * ============================================================
 */
const getAttendanceReport = async (req, res) => {
    try {
        const { classId, startDate, endDate } = req.query;
        if (!classId ||
            !startDate ||
            !endDate) {
            return res.status(400).json({
                message: "classId, startDate and endDate are required",
            });
        }
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const sessions = await client_1.prisma.attendanceSession.findMany({
            where: {
                classId: Number(classId),
                date: {
                    gte: start,
                    lte: end,
                },
            },
            select: {
                id: true,
                date: true,
            },
        });
        if (sessions.length === 0) {
            return res.json({
                records: [],
                summary: [],
            });
        }
        const sessionIds = sessions.map((session) => session.id);
        const allRecords = await client_1.prisma.attendanceEntry.findMany({
            where: {
                attendanceSessionId: {
                    in: sessionIds,
                },
            },
            include: {
                student: true,
                session: true,
            },
            orderBy: {
                id: "desc",
            },
        });
        const latestMap = new Map();
        for (const record of allRecords) {
            const sessionDate = new Date(record.session.date)
                .toISOString()
                .split("T")[0];
            const key = `${record.studentId}-${sessionDate}`;
            if (!latestMap.has(key)) {
                latestMap.set(key, record);
            }
        }
        const latestRecords = [...latestMap.values()];
        const report = latestRecords.map((record) => ({
            studentId: record.student.id,
            studentName: `${record.student.firstName} ${record.student.lastName}`,
            admissionNumber: record.student.admissionNo || "N/A",
            status: record.status,
            date: record.session.date,
        }));
        const summary = {
            totalStudents: report.length,
            present: report.filter((r) => r.status === "PRESENT").length,
            absent: report.filter((r) => r.status === "ABSENT").length,
            late: report.filter((r) => r.status === "LATE").length,
        };
        return res.json({
            records: report,
            summary,
        });
    }
    catch (error) {
        console.error("REPORT ERROR:", error);
        const err = error;
        return res.status(500).json({
            message: "Server error",
            error: err.message || "Unknown error",
        });
    }
};
exports.getAttendanceReport = getAttendanceReport;
/**
 * ============================================================
 * STUDENT — ATTENDANCE SUMMARY
 * ============================================================
 */
const getStudentAttendanceSummary = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                message: "Not authenticated",
            });
        }
        const student = await client_1.prisma.student.findFirst({
            where: {
                userId: user.id,
            },
        });
        if (!student) {
            return res.status(404).json({
                message: "Student not found",
            });
        }
        const records = await client_1.prisma.attendanceEntry.findMany({
            where: {
                studentId: student.id,
            },
        });
        const totalDays = records.length;
        const present = records.filter((record) => record.status === "PRESENT").length;
        const absent = records.filter((record) => record.status === "ABSENT").length;
        const percentage = totalDays === 0
            ? 0
            : Math.round((present / totalDays) * 100);
        return res.json({
            totalDays,
            present,
            absent,
            percentage,
        });
    }
    catch (error) {
        console.error("getStudentAttendanceSummary error:", error);
        return res.status(500).json({
            message: "Failed to fetch attendance summary",
        });
    }
};
exports.getStudentAttendanceSummary = getStudentAttendanceSummary;
/**
 * ============================================================
 * PARENT — GET ATTENDANCE
 * ============================================================
 */
const getParentAttendance = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                message: "Not authenticated",
            });
        }
        // Resolve Parent profile from authenticated User
        const parent = await client_1.prisma.parent.findUnique({
            where: {
                userId: user.id,
            },
        });
        if (!parent) {
            return res.status(404).json({
                message: "Parent profile not found",
            });
        }
        const links = await client_1.prisma.parentStudent.findMany({
            where: {
                parentId: parent.id,
            },
            select: {
                studentId: true,
            },
        });
        const studentIds = links.map((link) => link.studentId);
        if (studentIds.length === 0) {
            return res.json([]);
        }
        const entries = await client_1.prisma.attendanceEntry.findMany({
            where: {
                studentId: {
                    in: studentIds,
                },
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
        return res.json(entries);
    }
    catch (error) {
        console.error("getParentAttendance error:", error);
        return res.status(500).json({
            message: "Failed to fetch attendance",
        });
    }
};
exports.getParentAttendance = getParentAttendance;
/**
 * ============================================================
 * ADMIN — ABSENCE COUNT
 * ============================================================
 */
const getStudentAbsenceCount = async (req, res) => {
    try {
        const { studentId, startDate, endDate } = req.query;
        if (!studentId ||
            !startDate ||
            !endDate) {
            return res.status(400).json({
                message: "studentId, startDate and endDate are required",
            });
        }
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const absentCount = await client_1.prisma.attendanceEntry.count({
            where: {
                studentId: Number(studentId),
                status: "ABSENT",
                session: {
                    date: {
                        gte: start,
                        lte: end,
                    },
                },
            },
        });
        return res.json({
            studentId: Number(studentId),
            totalAbsent: absentCount,
        });
    }
    catch (error) {
        console.error("ABSENCE COUNT ERROR:", error);
        const err = error;
        return res.status(500).json({
            message: "Server error",
            error: err.message || "Unknown error",
        });
    }
};
exports.getStudentAbsenceCount = getStudentAbsenceCount;
