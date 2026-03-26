"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportCardReadRoutes = void 0;
const express_1 = require("express");
const client_1 = require("../prisma/client");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const client_2 = require("@prisma/client");
const router = (0, express_1.Router)();
exports.reportCardReadRoutes = router;
/**
 * ============================================================
 * TEACHER — COMPUTED REPORT CARDS (🔥 FIXED ENGINE)
 * GET /api/report-cards/teacher/:classId/:term
 * ============================================================
 */
router.get("/teacher/:classId/:term", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    console.log("🔥 NEW REPORT LOGIC RUNNING");
    console.log("PARAMS:", req.params);
    try {
        const classId = Number(req.params.classId);
        const termParam = req.params.term;
        if (Array.isArray(termParam)) {
            return res.status(400).json({ message: "Invalid term parameter" });
        }
        const termName = termParam;
        if (Number.isNaN(classId)) {
            return res.status(400).json({ message: "Invalid classId" });
        }
        // 🔍 Normalize term input (term1 → term 1)
        const normalizedTermName = termName
            .toLowerCase()
            .replace("term", "term ")
            .trim();
        const term = await client_1.prisma.term.findFirst({
            where: {
                name: {
                    equals: normalizedTermName,
                    mode: "insensitive",
                },
            },
        });
        console.log("✅ TERM FOUND:", term);
        if (!term) {
            return res.status(404).json({ message: "Term not found" });
        }
        // ✅ Get students
        const students = await client_1.prisma.student.findMany({
            where: { classId },
            include: { user: true },
        });
        console.log("👨‍🎓 STUDENTS:", students);
        // ✅ Get assessments WITH SUBJECT + SCORES
        const assessments = await client_1.prisma.assessment.findMany({
            where: {
                classId,
                termId: term.id,
                status: "SUBMITTED",
            },
            include: {
                subject: true,
                scores: true,
            },
        });
        console.log("📊 ASSESSMENTS:", assessments);
        console.log("📊 ASSESSMENTS COUNT:", assessments.length);
        // ✅ Compute report
        const report = students.map((student) => {
            const subjectMap = {};
            assessments.forEach((assessment) => {
                console.log("➡️ CHECKING ASSESSMENT:", {
                    assessmentId: assessment.id,
                    subjectId: assessment.subjectId,
                    scores: assessment.scores,
                });
                const score = assessment.scores.find((s) => s.studentId === student.id);
                console.log("➡️ MATCHED SCORE:", score);
                if (!score)
                    return;
                const subjectName = assessment.subject?.name || `Subject ${assessment.subjectId}`;
                if (!subjectMap[subjectName]) {
                    subjectMap[subjectName] = { total: 0, count: 0 };
                }
                subjectMap[subjectName].total += score.score;
                subjectMap[subjectName].count++;
            });
            const subjects = Object.entries(subjectMap).map(([subject, data]) => {
                const avg = data.count > 0 ? data.total / data.count : 0;
                return {
                    subject,
                    average: avg,
                };
            });
            const overallTotal = subjects.reduce((sum, s) => sum + s.average, 0);
            const overallAverage = subjects.length > 0 ? overallTotal / subjects.length : 0;
            return {
                studentId: student.id,
                name: student.user?.name ||
                    `${student.firstName} ${student.lastName}`,
                subjects,
                overallAverage,
            };
        });
        console.log("🧠 FINAL REPORT:", report);
        // ✅ IMPORTANT: SEND RESPONSE
        return res.json(report);
    }
    catch (err) {
        console.error("🔥 REPORT CARD ERROR:", err);
        res.status(500).json({ message: "Failed to load report cards" });
    }
});
/**
 * ============================================================
 * STUDENT — VIEW OWN REPORT CARD (TERM)
 * GET /api/report-cards/me?termId=
 * ============================================================
 */
router.get("/me", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.STUDENT]), async (req, res) => {
    const user = req.user;
    const student = await client_1.prisma.student.findFirst({
        where: { userId: user.id },
        select: { id: true },
    });
    if (!student) {
        return res.status(404).json({ message: "Student record not found" });
    }
    const termIdRaw = req.query.termId;
    if (typeof termIdRaw !== "string") {
        return res.status(400).json({ message: "termId is required" });
    }
    const termId = Number(termIdRaw);
    if (Number.isNaN(termId)) {
        return res.status(400).json({ message: "Invalid termId" });
    }
    const reportCard = await client_1.prisma.reportCard.findUnique({
        where: {
            studentId_termId: {
                studentId: student.id,
                termId,
            },
        },
        include: {
            subjects: {
                include: { subject: true },
            },
            term: true,
            class: true,
        },
    });
    if (!reportCard || reportCard.status !== "PUBLISHED") {
        return res.status(404).json({
            message: "Report card not available",
        });
    }
    res.json(reportCard);
});
/**
 * ============================================================
 * PARENT — VIEW CHILDREN REPORT CARDS
 * ============================================================
 */
router.get("/parent", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.PARENT]), async (req, res) => {
    const parentId = req.user.id;
    const links = await client_1.prisma.parentStudent.findMany({
        where: { parentId },
        select: { studentId: true },
    });
    if (links.length === 0) {
        return res.json([]);
    }
    const studentIds = links.map((l) => l.studentId);
    const reportCards = await client_1.prisma.reportCard.findMany({
        where: {
            studentId: { in: studentIds },
            status: "PUBLISHED",
        },
        include: {
            student: true,
            class: true,
            term: true,
        },
    });
    res.json(reportCards);
});
/**
 * ============================================================
 * ADMIN / PARENT — VIEW REPORT CARD BY ID
 * ============================================================
 */
router.get("/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.ADMIN, client_2.Role.PARENT]), async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).json({
            message: "Invalid report card id",
        });
    }
    const reportCard = await client_1.prisma.reportCard.findUnique({
        where: { id },
        include: {
            subjects: {
                include: { subject: true },
            },
            student: true,
            class: true,
            term: true,
        },
    });
    if (!reportCard || reportCard.status !== "PUBLISHED") {
        return res.status(404).json({
            message: "Report card not available",
        });
    }
    if (req.user.role === client_2.Role.PARENT) {
        const link = await client_1.prisma.parentStudent.findFirst({
            where: {
                parentId: req.user.id,
                studentId: reportCard.studentId,
            },
        });
        if (!link) {
            return res.status(403).json({
                message: "You are not allowed to view this report card",
            });
        }
    }
    res.json(reportCard);
});
