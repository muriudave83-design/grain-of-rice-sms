"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAllSubjects = exports.listAllStudents = exports.adminDashboard = exports.teacherDashboard = exports.healthCheck = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Health check
 */
const healthCheck = async (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
};
exports.healthCheck = healthCheck;
/**
 * Teacher dashboard
 * - expects authenticateToken middleware to set req.user
 */
const teacherDashboard = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: "Not authenticated" });
        }
        // Subjects owned by teacher
        const subjects = await prisma.subject.findMany({
            where: { teacherId: user.id },
            select: { id: true },
        });
        const subjectIds = subjects.map((s) => s.id);
        const subjectsCount = subjectIds.length;
        // Students across teacher's subjects
        const studentsCount = subjectIds.length
            ? await prisma.enrollment.count({
                where: { subjectId: { in: subjectIds } },
            })
            : 0;
        // Assessments for these subjects
        const assessments = subjectIds.length
            ? await prisma.assessment.findMany({
                where: { subjectId: { in: subjectIds } },
                select: { id: true },
            })
            : [];
        let missingCount = 0;
        if (assessments.length > 0 && subjectIds.length > 0) {
            const assessmentIds = assessments.map((a) => a.id);
            const enrollmentsCount = await prisma.enrollment.count({
                where: { subjectId: { in: subjectIds } },
            });
            const existingScoresCount = await prisma.assessmentScore.count({
                where: { assessmentId: { in: assessmentIds } },
            });
            // Expected scores = enrollments × assessments
            const expectedScores = enrollmentsCount * assessmentIds.length;
            missingCount = Math.max(0, expectedScores - existingScoresCount);
        }
        // ✅ Average grade across teacher's subjects (Phase 2 compliant)
        const termId = req.query.termId
            ? Number(req.query.termId)
            : null;
        // ✅ Average grade across teacher's subjects (TERM AWARE)
        const avg = await prisma.grade.aggregate({
            where: {
                subjectId: { in: subjectIds },
                ...(termId
                    ? {
                        termId,
                    }
                    : {}),
            },
            _avg: {
                average: true,
            },
        });
        res.json({
            subjects: subjectsCount,
            students: studentsCount,
            missing: missingCount,
            avgClassScore: avg._avg?.average ?? 0,
        });
    }
    catch (err) {
        console.error("teacherDashboard error:", err);
        res.status(500).json({
            message: "Server error",
            error: err.message,
        });
    }
};
exports.teacherDashboard = teacherDashboard;
/**
 * Admin dashboard
 */
const adminDashboard = async (req, res) => {
    try {
        const [students, teachers, subjects] = await Promise.all([
            prisma.student.count(),
            prisma.user.count({ where: { role: client_1.Role.TEACHER } }),
            prisma.subject.count(),
        ]);
        res.json({ students, teachers, subjects });
    }
    catch (err) {
        console.error("adminDashboard error:", err);
        res.status(500).json({
            message: "Server error",
            error: err.message,
        });
    }
};
exports.adminDashboard = adminDashboard;
/**
 * List all students (admin only)
 */
const listAllStudents = async (_req, res) => {
    try {
        const students = await prisma.student.findMany({
            take: 200,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                class: {
                    select: {
                        name: true,
                    },
                },
            },
        });
        res.json(students);
    }
    catch (err) {
        console.error("listAllStudents error:", err);
        res.status(500).json({
            message: "Server error",
            error: err.message,
        });
    }
};
exports.listAllStudents = listAllStudents;
/**
 * List all subjects (admin / public)
 */
const listAllSubjects = async (_req, res) => {
    try {
        const subjects = await prisma.subject.findMany({
            take: 200,
            select: {
                id: true,
                name: true,
                code: true,
                teacherId: true,
            },
        });
        res.json(subjects);
    }
    catch (err) {
        console.error("listAllSubjects error:", err);
        res.status(500).json({
            message: "Server error",
            error: err.message,
        });
    }
};
exports.listAllSubjects = listAllSubjects;
