"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParentAttendanceSummary = void 0;
const client_1 = require("../../prisma/client");
/**
 * Parent attendance summary (aggregated)
 * READ-ONLY
 */
const getParentAttendanceSummary = async (req, res) => {
    try {
        const studentId = Number(req.params.studentId);
        const termId = Number(req.query.termId);
        if (Number.isNaN(studentId) || Number.isNaN(termId)) {
            return res.status(400).json({ message: "Invalid parameters" });
        }
        const entries = await client_1.prisma.attendanceEntry.findMany({
            where: {
                studentId,
            },
            select: {
                status: true,
                session: {
                    select: {
                        id: true,
                        // keep minimal – just enough to filter
                        classId: true,
                        date: true,
                    },
                },
            },
        });
        if (entries.length === 0) {
            return res.json({
                student: { id: studentId },
                summary: null,
            });
        }
        const summary = {
            PRESENT: 0,
            ABSENT: 0,
            LATE: 0,
            EXCUSED: 0,
            TOTAL: entries.length,
        };
        for (const e of entries) {
            summary[e.status]++;
        }
        return res.json({
            student: { id: studentId },
            summary,
        });
    }
    catch {
        return res.status(500).json({
            message: "Failed to load attendance summary",
        });
    }
};
exports.getParentAttendanceSummary = getParentAttendanceSummary;
