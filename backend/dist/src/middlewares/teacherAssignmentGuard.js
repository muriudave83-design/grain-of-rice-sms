"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTeacherAssignment = void 0;
const client_1 = require("../prisma/client");
const client_2 = require("@prisma/client");
const requireTeacherAssignment = async (req, res, next) => {
    try {
        const user = req.user;
        // Only enforce for teachers
        if (!user || user.role !== client_2.Role.TEACHER) {
            return next();
        }
        const classId = Number(req.body.classId || req.query.classId);
        const subjectId = Number(req.body.subjectId || req.query.subjectId);
        if (!classId || !subjectId) {
            return res.status(400).json({
                message: "classId and subjectId are required"
            });
        }
        const assignment = await client_1.prisma.teacherSubject.findFirst({
            where: {
                teacherId: user.id,
                classId,
                subjectId
            }
        });
        if (!assignment) {
            return res.status(403).json({
                message: "You are not assigned to this class and subject"
            });
        }
        next();
    }
    catch (error) {
        console.error("Teacher assignment guard error:", error);
        res.status(500).json({ message: "Authorization check failed" });
    }
};
exports.requireTeacherAssignment = requireTeacherAssignment;
