"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeacherAssignments = void 0;
const client_1 = require("../prisma/client");
const getTeacherAssignments = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const assignments = await client_1.prisma.teacherSubject.findMany({
            where: {
                teacherId: teacherId
            },
            include: {
                subject: true,
                class: true
            }
        });
        res.json(assignments);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to fetch teacher assignments"
        });
    }
};
exports.getTeacherAssignments = getTeacherAssignments;
