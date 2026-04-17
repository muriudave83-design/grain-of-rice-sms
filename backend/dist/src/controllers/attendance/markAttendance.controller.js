"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAttendance = markAttendance;
const client_1 = require("../../prisma/client");
const client_2 = require("@prisma/client");
async function markAttendance(req, res) {
    try {
        // ✅ Convert to numbers (FIX)
        const studentIdNum = Number(req.body.studentId);
        const classIdNum = Number(req.body.classId);
        const status = req.body.status;
        // ✅ Validate
        if (isNaN(studentIdNum) || isNaN(classIdNum) || !status) {
            return res.status(400).json({ message: "Missing or invalid fields" });
        }
        let session = await client_1.prisma.attendanceSession.findFirst({
            where: {
                classId: classIdNum, // ✅ FIXED
                date: new Date(),
            },
        });
        if (!session) {
            session = await client_1.prisma.attendanceSession.create({
                data: {
                    classId: classIdNum, // ✅ FIXED
                    teacherId: 1,
                    date: new Date(),
                    status: client_2.AttendanceSessionStatus.DRAFT,
                },
            });
        }
        const record = await client_1.prisma.attendanceEntry.upsert({
            where: {
                attendanceSessionId_studentId: {
                    attendanceSessionId: session.id,
                    studentId: studentIdNum, // ✅ FIXED
                },
            },
            update: {
                status,
            },
            create: {
                studentId: studentIdNum, // ✅ FIXED
                attendanceSessionId: session.id,
                status,
            },
        });
        return res.json(record);
    }
    catch (error) {
        console.error("Mark attendance error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
