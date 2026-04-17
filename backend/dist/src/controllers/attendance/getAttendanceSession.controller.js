"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttendanceSession = getAttendanceSession;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function getAttendanceSession(req, res) {
    try {
        const sessionId = Number(req.params.id);
        // ✅ Validate sessionId early
        if (isNaN(sessionId)) {
            console.warn("⚠️ Invalid session ID");
            return res.status(200).json({
                session: null,
                students: [],
                entries: [],
                message: "Invalid session ID",
            });
        }
        const session = await prisma.attendanceSession.findUnique({
            where: { id: sessionId },
            include: {
                entries: true,
                class: true,
            },
        });
        // ✅ FAIL-SAFE: No session → return empty, not error
        if (!session) {
            console.warn(`⚠️ Session not found: ${sessionId}`);
            return res.status(200).json({
                session: null,
                students: [],
                entries: [],
                message: "No session found",
            });
        }
        const students = await prisma.student.findMany({
            where: { classId: session.classId },
            orderBy: [
                { firstName: "asc" },
                { lastName: "asc" }
            ]
        });
        return res.status(200).json({
            session,
            students,
            entries: session.entries,
        });
    }
    catch (error) {
        console.error("❌ Attendance session error:", error);
        // ✅ FAIL-SAFE: Never crash UI
        return res.status(200).json({
            session: null,
            students: [],
            entries: [],
            message: "Failed to load attendance session",
        });
    }
}
