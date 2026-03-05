"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../../prisma/client");
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../../middlewares/rolesMiddleware");
const router = (0, express_1.Router)();
/**
 * GET /api/admin/teacher-subjects
 * List all teacher → subject → class assignments
 */
router.get("/teacher-subjects", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const subjects = await client_1.prisma.subject.findMany({
            where: {
                teacherId: { not: null }
            },
            include: {
                teacher: true,
                classSubjects: {
                    include: {
                        class: true
                    }
                }
            }
        });
        const assignments = subjects.flatMap((subject) => subject.classSubjects.map((cs) => ({
            teacher: {
                id: subject.teacher?.id,
                name: subject.teacher?.name
            },
            subject: {
                id: subject.id,
                name: subject.name
            },
            class: {
                id: cs.class.id,
                name: cs.class.name
            }
        })));
        res.json(assignments);
    }
    catch (error) {
        console.error("Error fetching teacher-subject assignments:", error);
        res.status(500).json({ message: "Failed to fetch teacher assignments" });
    }
});
/**
 * POST /api/admin/teacher-subjects
 * Assign a teacher to a subject
 */
router.post("/teacher-subjects", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const teacherId = Number(req.body.teacherId);
        const subjectId = Number(req.body.subjectId);
        if (!teacherId || !subjectId) {
            return res.status(400).json({
                message: "teacherId and subjectId are required"
            });
        }
        const updatedSubject = await client_1.prisma.subject.update({
            where: { id: subjectId },
            data: { teacherId: teacherId }
        });
        res.json({
            message: "Teacher assigned successfully",
            subject: updatedSubject
        });
    }
    catch (error) {
        console.error("Assign teacher error:", error);
        res.status(500).json({
            message: "Failed to assign teacher"
        });
    }
});
exports.default = router;
