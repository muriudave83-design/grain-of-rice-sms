"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClassAttendance = getClassAttendance;
const client_1 = require("../../prisma/client");
async function getClassAttendance(req, res) {
    try {
        const classId = Number(req.params.classId);
        // ✅ Get students WITH user
        const students = await client_1.prisma.student.findMany({
            where: { classId },
            include: {
                user: true,
            },
        });
        // ✅ Format response
        const result = students.map((s) => ({
            studentId: s.id,
            name: s.user?.name || "Unknown",
            status: null,
        }));
        res.json(result);
    }
    catch (err) {
        console.error("Error fetching class attendance:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}
