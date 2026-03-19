"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportCardReadRoutes = void 0;
const express_1 = require("express");
const client_1 = require("../prisma/client");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const client_2 = require("@prisma/client");
// ✅ CONTROLLER IMPORT
const reportCard_controller_1 = require("../controllers/reportCard.controller");
const router = (0, express_1.Router)();
exports.reportCardReadRoutes = router;
/**
 * ============================================================
 * HELPER — GRADE CALCULATOR
 * ============================================================
 */
function getGrade(avg) {
    if (avg >= 0.8)
        return "A";
    if (avg >= 0.7)
        return "B";
    if (avg >= 0.6)
        return "C";
    if (avg >= 0.5)
        return "D";
    return "E";
}
/**
 * ============================================================
 * 🚀 NEW — GENERATE REPORT CARD (DYNAMIC)
 * GET /api/report-cards/generate/:studentId
 * ============================================================
 */
router.get("/generate/:studentId", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const studentId = Number(req.params.studentId);
        const student = await client_1.prisma.student.findUnique({
            where: { id: studentId },
        });
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }
        // Subjects in class
        const classSubjects = await client_1.prisma.classSubject.findMany({
            where: { classId: student.classId },
            include: { subject: true },
        });
        const categories = await client_1.prisma.assignmentCategory.findMany();
        const results = [];
        let overallTotal = 0;
        let subjectCount = 0;
        for (const cs of classSubjects) {
            const assessments = await client_1.prisma.assessment.findMany({
                where: {
                    subjectId: cs.subjectId,
                    classId: student.classId,
                },
                select: {
                    id: true,
                    maxScore: true,
                    categoryId: true,
                },
            });
            if (assessments.length === 0)
                continue;
            const scores = await client_1.prisma.assessmentScore.findMany({
                where: {
                    studentId,
                    assessmentId: {
                        in: assessments.map((a) => a.id),
                    },
                },
            });
            const scoreMap = {};
            scores.forEach((s) => {
                scoreMap[s.assessmentId] = s.score;
            });
            const categoryBuckets = {};
            // Normalize + group
            for (const a of assessments) {
                const score = scoreMap[a.id];
                if (score != null && a.categoryId && a.maxScore > 0) {
                    const value = score / a.maxScore;
                    if (!categoryBuckets[a.categoryId]) {
                        categoryBuckets[a.categoryId] = [];
                    }
                    categoryBuckets[a.categoryId].push(value);
                }
            }
            // Weighted calculation
            let weightedTotal = 0;
            for (const category of categories) {
                const values = categoryBuckets[category.id] || [];
                const weight = (category.weight ?? 0) / 100;
                if (!weight)
                    continue;
                let categoryAverage = 0;
                if (values.length > 0) {
                    categoryAverage =
                        values.reduce((a, b) => a + b, 0) / values.length;
                }
                weightedTotal += categoryAverage * weight;
            }
            if (weightedTotal === 0)
                continue;
            overallTotal += weightedTotal;
            subjectCount++;
            results.push({
                subject: cs.subject.name,
                average: Number((weightedTotal * 100).toFixed(2)),
                grade: getGrade(weightedTotal),
            });
        }
        const overallAverage = subjectCount > 0 ? overallTotal / subjectCount : 0;
        res.json({
            student,
            results,
            overallAverage: Number((overallAverage * 100).toFixed(2)),
            overallGrade: getGrade(overallAverage),
        });
    }
    catch (err) {
        console.error("Report card generation failed:", err);
        res.status(500).json({
            message: "Failed to generate report card",
        });
    }
});
/**
 * ============================================================
 * STUDENT — GET MY REPORT CARDS
 * ============================================================
 */
router.get("/me", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.STUDENT]), async (req, res) => {
    const user = req.user;
    if (!user?.studentId) {
        return res.status(400).json({
            message: "Student account not linked",
        });
    }
    const reportCards = await client_1.prisma.reportCard.findMany({
        where: {
            studentId: user.studentId,
            status: "PUBLISHED",
        },
        include: {
            class: true,
            term: true,
        },
        orderBy: {
            publishedAt: "desc",
        },
    });
    res.json(reportCards);
});
/**
 * ============================================================
 * PARENT — GET REPORT CARDS
 * ============================================================
 */
router.get("/parent", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.PARENT]), reportCard_controller_1.getParentReportCards);
/**
 * ============================================================
 * 👨‍🏫 TEACHER — CLASS REPORT CARDS (DYNAMIC)
 * GET /api/teacher/report-cards/:classId/:term
 * ============================================================
 */
router.get("/teacher/report-cards/:classId/:term", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    try {
        const classId = Number(req.params.classId);
        const students = await client_1.prisma.student.findMany({
            where: { classId },
        });
        const classSubjects = await client_1.prisma.classSubject.findMany({
            where: { classId },
            include: { subject: true },
        });
        const categories = await client_1.prisma.assignmentCategory.findMany();
        const results = [];
        for (const student of students) {
            let overallTotal = 0;
            let subjectCount = 0;
            const subjects = [];
            for (const cs of classSubjects) {
                const assessments = await client_1.prisma.assessment.findMany({
                    where: {
                        subjectId: cs.subjectId,
                        classId,
                    },
                    select: {
                        id: true,
                        maxScore: true,
                        categoryId: true,
                    },
                });
                if (!assessments.length)
                    continue;
                const scores = await client_1.prisma.assessmentScore.findMany({
                    where: {
                        studentId: student.id,
                        assessmentId: {
                            in: assessments.map((a) => a.id),
                        },
                    },
                });
                const scoreMap = {};
                scores.forEach((s) => {
                    scoreMap[s.assessmentId] = s.score;
                });
                const categoryBuckets = {};
                for (const a of assessments) {
                    const score = scoreMap[a.id];
                    if (score != null && a.categoryId && a.maxScore > 0) {
                        const value = score / a.maxScore;
                        if (!categoryBuckets[a.categoryId]) {
                            categoryBuckets[a.categoryId] = [];
                        }
                        categoryBuckets[a.categoryId].push(value);
                    }
                }
                let weightedTotal = 0;
                for (const category of categories) {
                    const values = categoryBuckets[category.id] || [];
                    const weight = (category.weight ?? 0) / 100;
                    if (!weight)
                        continue;
                    let categoryAverage = 0;
                    if (values.length > 0) {
                        categoryAverage =
                            values.reduce((a, b) => a + b, 0) / values.length;
                    }
                    weightedTotal += categoryAverage * weight;
                }
                if (weightedTotal === 0)
                    continue;
                overallTotal += weightedTotal;
                subjectCount++;
                subjects.push({
                    subject: cs.subject.name,
                    average: Number((weightedTotal * 100).toFixed(2)),
                    grade: getGrade(weightedTotal),
                });
            }
            const overallAverage = subjectCount > 0 ? overallTotal / subjectCount : 0;
            results.push({
                studentId: student.id,
                name: `${student.firstName} ${student.lastName}`,
                subjects,
                overallAverage: Number((overallAverage * 100).toFixed(2)),
                overallGrade: getGrade(overallAverage),
            });
        }
        res.json(results);
    }
    catch (err) {
        console.error("Teacher report cards failed:", err);
        res.status(500).json({
            message: "Failed to load class report cards",
        });
    }
});
/**
 * ============================================================
 * READ — GET SINGLE REPORT CARD
 * ============================================================
 */
router.get("/:id", authMiddleware_1.authenticate, async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).json({
            message: "Invalid report card id",
        });
    }
    const reportCard = await client_1.prisma.reportCard.findUnique({
        where: { id },
        include: {
            student: true,
            class: true,
            term: true,
        },
    });
    if (!reportCard) {
        return res.status(404).json({
            message: "Report card not found",
        });
    }
    if (reportCard.status !== "PUBLISHED" &&
        req.user?.role !== client_2.Role.ADMIN) {
        return res.status(403).json({
            message: "You are not authorized to view this report card",
        });
    }
    if (req.user?.role === client_2.Role.PARENT) {
        const parentStudent = await client_1.prisma.parentStudent.findFirst({
            where: {
                parentId: req.user.id,
                studentId: reportCard.studentId,
            },
        });
        if (!parentStudent) {
            return res.status(403).json({
                message: "You are not authorized to view this report card",
            });
        }
    }
    res.json(reportCard);
});
