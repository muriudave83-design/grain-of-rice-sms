"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAttendance = markAttendance;
const client_1 = require("../../prisma/client");
const client_2 = require("@prisma/client");
async function markAttendance(req, res) {
    try {
        const studentIdNum = Number(req.body.studentId);
        const classIdNum = Number(req.body.classId);
        const status = req.body.status;
        if (isNaN(studentIdNum) || isNaN(classIdNum) || !status) {
            return res.status(400).json({
                message: "Missing or invalid fields",
            });
        }
        // ✅ USE PROVIDED DATE OR FALL BACK TO TODAY
        const selectedDate = req.body.date
            ? new Date(req.body.date)
            : new Date();
        selectedDate.setHours(0, 0, 0, 0);
        // ✅ END OF SELECTED DAY
        const nextDay = new Date(selectedDate);
        nextDay.setDate(nextDay.getDate() + 1);
        // ✅ FIND TODAY SESSION PROPERLY
        let session = await client_1.prisma.attendanceSession.findFirst({
            where: {
                classId: classIdNum,
                date: {
                    gte: selectedDate,
                    lt: nextDay,
                },
            },
        });
        // ✅ CREATE ONLY IF NONE EXISTS
        if (!session) {
            session = await client_1.prisma.attendanceSession.create({
                data: {
                    classId: classIdNum,
                    teacherId: 1,
                    date: selectedDate,
                    status: client_2.AttendanceSessionStatus.DRAFT,
                },
            });
        }
        // ✅ UPSERT ENTRY
        const record = await client_1.prisma.attendanceEntry.upsert({
            where: {
                attendanceSessionId_studentId: {
                    attendanceSessionId: session.id,
                    studentId: studentIdNum,
                },
            },
            update: {
                status,
            },
            create: {
                studentId: studentIdNum,
                attendanceSessionId: session.id,
                status,
            },
        });
        return res.json(record);
    }
    catch (error) {
        console.error("Mark attendance error:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
}
