"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../prisma/client");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const client_2 = require("@prisma/client");
const router = (0, express_1.Router)();
/**
 * 📘 Get teacher assignments (subjects + classes)
 */
router.get("/teacher/assignments", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    try {
        const teacherId = req.user?.id;
        const assignments = await client_1.prisma.teacherSubject.findMany({
            where: {
                teacherId: teacherId,
            },
            include: {
                subject: true,
                class: true,
            },
        });
        return res.status(200).json(assignments);
    }
    catch (error) {
        console.error("Error fetching teacher assignments:", error);
        return res.status(500).json({
            error: "Failed to fetch teacher assignments",
        });
    }
});
/**
 * 🏫 Get unique classes for a teacher
 */
router.get("/teacher/classes", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    try {
        const teacherId = req.user?.id;
        const teacherSubjects = await client_1.prisma.teacherSubject.findMany({
            where: {
                teacherId: teacherId,
            },
            include: {
                class: true,
            },
        });
        const uniqueClassesMap = new Map();
        teacherSubjects.forEach((ts) => {
            if (ts.class) {
                uniqueClassesMap.set(ts.class.id, ts.class);
            }
        });
        const classes = Array.from(uniqueClassesMap.values());
        return res.status(200).json(classes);
    }
    catch (error) {
        console.error("Error fetching teacher classes:", error);
        return res.status(500).json({
            error: "Failed to fetch teacher classes",
        });
    }
});
/**
 * 👨‍🎓 Get students in a class (for teacher)
 */
router.get("/teacher/class/:id/students", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    try {
        const classId = Number(req.params.id);
        const students = await client_1.prisma.student.findMany({
            where: {
                classId: classId,
                isArchived: false,
            },
        });
        return res.status(200).json(students);
    }
    catch (error) {
        console.error("Error fetching class students:", error);
        return res.status(200).json([]);
    }
});
/**
 * 📊 Get student gradebook (assignments + scores)
 */
router.get("/teacher/student/:id/gradebook", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    try {
        const studentId = Number(req.params.id);
        const scores = await client_1.prisma.assessmentScore.findMany({
            where: {
                studentId: studentId,
            },
            include: {
                assessment: true,
            },
        });
        // ✅ FIXED: include assessmentId
        const result = scores.map((s) => ({
            title: s.assessment.title,
            score: s.score,
            assessmentId: s.assessmentId, // 🔥 REQUIRED for inline editing
        }));
        return res.status(200).json(result);
    }
    catch (error) {
        console.error("Error fetching gradebook:", error);
        return res.status(200).json([]);
    }
});
/**
 * 🚀 NEW: Create assignment FOR A CLASS (Phase 2 CORE)
 */
router.post("/teacher/class/:id/assignment", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    try {
        const teacherId = req.user?.id;
        const classId = Number(req.params.id);
        const { title, type, maxScore } = req.body;
        const teacherSubject = await client_1.prisma.teacherSubject.findFirst({
            where: {
                teacherId,
                classId,
            },
        });
        if (!teacherSubject) {
            return res.status(403).json({
                message: "Unauthorized for this class",
            });
        }
        const students = await client_1.prisma.student.findMany({
            where: {
                classId,
                isArchived: false,
            },
        });
        if (students.length === 0) {
            return res.status(200).json({
                message: "No students in class",
            });
        }
        const term = await client_1.prisma.term.findFirst();
        if (!term) {
            return res.status(200).json({
                message: "No term found",
            });
        }
        const assessment = await client_1.prisma.assessment.create({
            data: {
                title,
                type: client_2.AssessmentType[type],
                maxScore: Number(maxScore),
                classId,
                subjectId: teacherSubject.subjectId,
                termId: term.id,
                date: new Date(),
                weight: 1,
            },
        });
        const scoreData = students.map((s) => ({
            studentId: s.id,
            assessmentId: assessment.id,
            score: 0,
        }));
        await client_1.prisma.assessmentScore.createMany({
            data: scoreData,
        });
        return res.status(200).json({
            message: "Assignment created for class",
        });
    }
    catch (err) {
        console.error("Error creating class assignment:", err);
        return res.status(500).json({
            message: "Failed to create assignment",
        });
    }
});
/**
 * ⚠️ OLD: Create assignment FOR a specific student (TO BE REMOVED)
 */
router.post("/teacher/student/:id/assignment", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    try {
        const studentId = Number(req.params.id);
        const { title, type, maxScore } = req.body;
        const student = await client_1.prisma.student.findUnique({
            where: { id: studentId },
        });
        if (!student) {
            return res.status(200).json({ message: "Student not found" });
        }
        const teacherSubject = await client_1.prisma.teacherSubject.findFirst({
            where: {
                classId: student.classId,
            },
        });
        if (!teacherSubject) {
            return res.status(200).json({ message: "No subject found" });
        }
        const term = await client_1.prisma.term.findFirst();
        if (!term) {
            return res.status(200).json({ message: "No term found" });
        }
        const assessment = await client_1.prisma.assessment.create({
            data: {
                title,
                type: client_2.AssessmentType[type],
                maxScore: Number(maxScore),
                classId: student.classId,
                subjectId: teacherSubject.subjectId,
                termId: term.id,
                date: new Date(),
                weight: 1,
            },
        });
        await client_1.prisma.assessmentScore.create({
            data: {
                studentId,
                assessmentId: assessment.id,
                score: 0,
            },
        });
        return res.status(200).json({ message: "Created" });
    }
    catch (err) {
        console.error("Error creating assignment:", err);
        return res.status(200).json({});
    }
});
/**
 * ✏️ NEW: Update score (INLINE EDITING)
 */
router.put("/teacher/score", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    try {
        const { studentId, assessmentId, score } = req.body;
        await client_1.prisma.assessmentScore.updateMany({
            where: {
                studentId: Number(studentId),
                assessmentId: Number(assessmentId),
            },
            data: {
                score: Number(score),
            },
        });
        return res.status(200).json({ message: "Updated" });
    }
    catch (err) {
        console.error("Error updating score:", err);
        return res.status(500).json({});
    }
});
exports.default = router;
