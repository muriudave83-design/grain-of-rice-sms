"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../prisma/client");
const prisma = client_1.prisma;
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const client_2 = require("@prisma/client");
const reportCard_service_1 = require("../services/reportCard.service");
const grade_service_1 = require("../services/grade.service");
const router = (0, express_1.Router)();
/**
 * ============================================================
 * GET students + existing scores for an assessment
 * ============================================================
 */
router.get("/:id/scores", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    try {
        console.log("🔥 SCORES ROUTE HIT");
        console.log("PARAM ID =", req.params.id);
        console.log("USER =", req.user);
        const id = Number(req.params.id);
        const user = req.user;
        const assessment = await prisma.assessment.findUnique({
            where: { id },
            include: {
                subject: true,
                scores: true,
            },
        });
        if (!assessment) {
            return res.status(404).json({ message: "Assessment not found" });
        }
        if (!assessment.classId) {
            return res.status(400).json({
                message: "Assessment is not linked to a class",
            });
        }
        /**
         * OWNERSHIP CHECK
         */
        if (assessment.subject.teacherId !== user.id) {
            return res.status(403).json({
                message: "You are not allowed to access this assessment.",
            });
        }
        /**
         * CLASS ↔ SUBJECT LINK CHECK
         */
        const link = await prisma.classSubject.findFirst({
            where: {
                classId: assessment.classId,
                subjectId: assessment.subjectId,
            },
        });
        if (!link) {
            return res.status(403).json({
                message: "You are not allowed to access this assessment.",
            });
        }
        /**
         * LOAD STUDENTS VIA ENROLLMENT
         */
        const enrollments = await prisma.enrollment.findMany({
            where: {
                subjectId: assessment.subjectId,
            },
            include: {
                student: {
                    select: {
                        id: true,
                        admissionNo: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: {
                student: { firstName: "asc" },
            },
        });
        const students = enrollments.map((e) => e.student);
        console.log("STUDENTS FOUND =", students.length);
        res.json({
            assessment: {
                id: assessment.id,
                title: assessment.title,
                maxScore: assessment.maxScore,
                status: assessment.status,
            },
            students,
            scores: assessment.scores,
        });
    }
    catch (error) {
        console.error("GET SCORES ERROR", error);
        res.status(500).json({ message: "Failed to load scores" });
    }
});
/**
 * ============================================================
 * SAVE / UPDATE SCORES (DRAFT)
 * ============================================================
 */
router.post("/:id/scores", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const user = req.user;
        const { scores } = req.body;
        if (!Array.isArray(scores)) {
            return res.status(400).json({
                message: "Invalid scores payload",
            });
        }
        const assessment = await prisma.assessment.findUnique({
            where: { id },
            include: { subject: true },
        });
        if (!assessment) {
            return res.status(404).json({ message: "Not found" });
        }
        if (assessment.subject.teacherId !== user.id) {
            return res.status(403).json({
                message: "You are not allowed to access this assessment.",
            });
        }
        const link = await prisma.classSubject.findFirst({
            where: {
                classId: assessment.classId,
                subjectId: assessment.subjectId,
            },
        });
        if (!link) {
            return res.status(403).json({
                message: "You are not allowed to access this assessment.",
            });
        }
        if (assessment.status === "SUBMITTED") {
            return res.status(400).json({
                message: "Assessment already submitted — locked",
            });
        }
        /**
         * SAVE SCORES
         */
        await Promise.all(scores.map((s) => prisma.assessmentScore.upsert({
            where: {
                assessmentId_studentId: {
                    assessmentId: id,
                    studentId: Number(s.studentId),
                },
            },
            update: {
                score: Number(s.score),
            },
            create: {
                assessmentId: id,
                studentId: Number(s.studentId),
                score: Number(s.score),
            },
        })));
        res.json({ message: "Scores saved" });
    }
    catch (error) {
        console.error("SAVE SCORES ERROR", error);
        res.status(500).json({ message: "Failed to save scores" });
    }
});
/**
 * ============================================================
 * SUBMIT (LOCK + COMPUTE GRADES + GENERATE REPORT CARDS)
 * ============================================================
 */
router.post("/:id/submit", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const user = req.user;
        const assessment = await prisma.assessment.findUnique({
            where: { id },
            include: { subject: true },
        });
        if (!assessment) {
            return res.status(404).json({ message: "Not found" });
        }
        if (assessment.subject.teacherId !== user.id) {
            return res.status(403).json({
                message: "You are not allowed to access this assessment.",
            });
        }
        const link = await prisma.classSubject.findFirst({
            where: {
                classId: assessment.classId,
                subjectId: assessment.subjectId,
            },
        });
        if (!link) {
            return res.status(403).json({
                message: "You are not allowed to access this assessment.",
            });
        }
        if (assessment.status === "SUBMITTED") {
            return res.status(400).json({
                message: "Assessment already submitted",
            });
        }
        /**
         * LOCK ASSESSMENT
         */
        const updatedAssessment = await prisma.assessment.update({
            where: { id },
            data: { status: "SUBMITTED" },
        });
        /**
         * COMPUTE GRADES FOR SUBJECT
         */
        await (0, grade_service_1.computeGradesForSubject)({
            classId: updatedAssessment.classId,
            subjectId: updatedAssessment.subjectId,
            termId: updatedAssessment.termId,
        });
        /**
         * GENERATE REPORT CARDS
         */
        await (0, reportCard_service_1.generateReportCardsForClass)({
            classId: updatedAssessment.classId,
            termId: updatedAssessment.termId,
        });
        res.json({
            message: "Assessment submitted, grades computed, and report cards regenerated",
        });
    }
    catch (error) {
        console.error("SUBMIT ERROR", error);
        res.status(500).json({
            message: "Failed to submit assessment",
        });
    }
});
exports.default = router;
