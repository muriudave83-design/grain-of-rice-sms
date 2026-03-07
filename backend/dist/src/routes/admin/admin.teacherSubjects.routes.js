"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../../prisma/client");
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../../middlewares/rolesMiddleware");
const router = (0, express_1.Router)();
/**
 * GET all assignments
 */
router.get("/teacher-subjects", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const assignments = await client_1.prisma.teacherSubject.findMany({
            include: {
                teacher: true,
                subject: true,
                class: true
            }
        });
        const result = assignments.map((a) => ({
            id: a.id,
            teacher: {
                id: a.teacher.id,
                name: a.teacher.name
            },
            subject: {
                id: a.subject.id,
                name: a.subject.name
            },
            class: {
                id: a.class.id,
                name: a.class.name
            }
        }));
        res.json(result);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to load assignments" });
    }
});
/**
 * CREATE assignment
 */
router.post("/teacher-subjects", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const teacherId = Number(req.body.teacherId);
        const subjectId = Number(req.body.subjectId);
        const classId = Number(req.body.classId);
        if (!teacherId || !subjectId || !classId) {
            return res.status(400).json({
                message: "teacherId, subjectId, and classId are required"
            });
        }
        /**
         * Prevent duplicate assignments
         */
        const existing = await client_1.prisma.teacherSubject.findFirst({
            where: {
                teacherId,
                subjectId,
                classId
            }
        });
        if (existing) {
            return res.status(400).json({
                message: "Teacher already assigned to this subject for this class"
            });
        }
        const assignment = await client_1.prisma.teacherSubject.create({
            data: {
                teacherId,
                subjectId,
                classId
            }
        });
        res.json(assignment);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to assign teacher" });
    }
});
/**
 * DELETE assignment
 */
router.delete("/teacher-subjects/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            return res.status(400).json({
                message: "Invalid assignment id"
            });
        }
        await client_1.prisma.teacherSubject.delete({
            where: { id }
        });
        res.json({ message: "Assignment removed" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to remove assignment" });
    }
});
exports.default = router;
