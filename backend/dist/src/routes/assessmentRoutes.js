"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assessmentRoutes = void 0;
const express_1 = require("express");
const client_1 = require("../prisma/client");
// TEMP TYPE BRIDGE — runtime is correct
const prisma = client_1.prisma;
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const teacherAssignmentGuard_1 = require("../middlewares/teacherAssignmentGuard"); // ✅ NEW
const client_2 = require("@prisma/client");
const grade_service_1 = require("../services/grade.service");
const assessmentController_1 = require("../controllers/assessmentController");
const router = (0, express_1.Router)();
exports.assessmentRoutes = router;
console.log("✅ assessmentRoutes LOADED");
/**
 * ============================================================
 * CREATE ASSESSMENT
 * ============================================================
 */
router.post("/", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), teacherAssignmentGuard_1.requireTeacherAssignment, // ✅ NEW SECURITY GUARD
assessmentController_1.createAssessment);
/**
 * ============================================================
 * TEACHER OWN ASSESSMENTS
 * ============================================================
 */
router.get("/mine", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    const teacherId = req.user.id;
    const assignments = await prisma.teacherSubject.findMany({
        where: { teacherId },
        select: { subjectId: true, classId: true }
    });
    const data = await prisma.assessment.findMany({
        where: {
            OR: assignments.map((a) => ({
                subjectId: a.subjectId,
                classId: a.classId
            }))
        },
        include: {
            subject: true,
            class: true,
            term: true
        },
        orderBy: { date: "desc" }
    });
    res.json(data);
});
/**
 * ============================================================
 * ⭐ TEACHER SUBJECTS FILTERED BY CLASS
 * GET /assessments/teacher/subjects?classId=1
 * ============================================================
 */
router.get("/teacher/subjects", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    const teacherId = req.user.id;
    const classId = Number(req.query.classId);
    if (!classId) {
        return res.status(400).json({ message: "classId is required" });
    }
    const assignments = await prisma.teacherSubject.findMany({
        where: {
            teacherId,
            classId
        },
        include: {
            subject: true
        },
        orderBy: {
            subject: { name: "asc" }
        }
    });
    const subjects = assignments.map((a) => a.subject);
    res.json(subjects);
});
/**
 * ============================================================
 * GET ASSESSMENTS
 * ============================================================
 */
router.get("/", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER, client_2.Role.ADMIN]), async (req, res) => {
    const user = req.user;
    let where = {};
    if (user.role === client_2.Role.TEACHER) {
        const assignments = await prisma.teacherSubject.findMany({
            where: { teacherId: user.id },
            select: { subjectId: true, classId: true }
        });
        where = {
            OR: assignments.map((a) => ({
                subjectId: a.subjectId,
                classId: a.classId
            }))
        };
    }
    const data = await prisma.assessment.findMany({
        where,
        include: {
            subject: true,
            class: true,
            term: true
        },
        orderBy: { date: "desc" }
    });
    res.json(data);
});
/**
 * ============================================================
 * GET SINGLE ASSESSMENT
 * ============================================================
 */
router.get("/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER, client_2.Role.ADMIN]), async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid assessment id" });
    }
    const assessment = await prisma.assessment.findUnique({
        where: { id },
        include: {
            subject: true,
            class: true,
            term: true
        }
    });
    if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
    }
    if (req.user.role === client_2.Role.TEACHER) {
        const assignment = await prisma.teacherSubject.findFirst({
            where: {
                teacherId: req.user.id,
                subjectId: assessment.subjectId,
                classId: assessment.classId
            }
        });
        if (!assignment) {
            return res.status(403).json({
                message: "You are not allowed to access this assessment"
            });
        }
    }
    res.json(assessment);
});
/**
 * ============================================================
 * GET SCORES
 * ============================================================
 */
router.get("/:id/scores", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    const assessmentId = Number(req.params.id);
    const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId }
    });
    if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
    }
    const assignment = await prisma.teacherSubject.findFirst({
        where: {
            teacherId: req.user.id,
            subjectId: assessment.subjectId,
            classId: assessment.classId
        }
    });
    if (!assignment) {
        return res.status(403).json({
            message: "You are not allowed to access this assessment"
        });
    }
    const students = await prisma.student.findMany({
        where: { classId: assessment.classId }
    });
    const scores = await prisma.assessmentScore.findMany({
        where: { assessmentId }
    });
    res.json({ assessment, students, scores });
});
/**
 * ============================================================
 * SAVE SCORES
 * ============================================================
 */
router.post("/:id/scores", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    const id = Number(req.params.id);
    const assessment = await prisma.assessment.findUnique({
        where: { id }
    });
    if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
    }
    const assignment = await prisma.teacherSubject.findFirst({
        where: {
            teacherId: req.user.id,
            subjectId: assessment.subjectId,
            classId: assessment.classId
        }
    });
    if (!assignment) {
        return res.status(403).json({
            message: "You are not allowed to access this assessment"
        });
    }
    if (assessment.status !== "DRAFT") {
        return res.status(400).json({ message: "Locked" });
    }
    const { scores } = req.body;
    for (const s of scores) {
        await prisma.assessmentScore.upsert({
            where: {
                assessmentId_studentId: {
                    assessmentId: id,
                    studentId: s.studentId
                }
            },
            update: { score: s.score },
            create: {
                assessmentId: id,
                studentId: s.studentId,
                score: s.score
            }
        });
    }
    res.json({ message: "Saved" });
});
/**
 * ============================================================
 * SUBMIT
 * ============================================================
 */
router.patch("/:id/submit", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    const id = Number(req.params.id);
    const assessment = await prisma.assessment.findUnique({
        where: { id }
    });
    if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
    }
    const assignment = await prisma.teacherSubject.findFirst({
        where: {
            teacherId: req.user.id,
            subjectId: assessment.subjectId,
            classId: assessment.classId
        }
    });
    if (!assignment) {
        return res.status(403).json({
            message: "You are not allowed to access this assessment"
        });
    }
    await prisma.assessment.update({
        where: { id },
        data: { status: "SUBMITTED" }
    });
    await (0, grade_service_1.computeGradesForSubject)({
        classId: assessment.classId,
        subjectId: assessment.subjectId,
        termId: assessment.termId
    });
    res.json({ message: "Locked" });
});
/**
 * ============================================================
 * SUBMIT (FRONTEND COMPATIBILITY ROUTE)
 * POST /assessments/:id/submit
 * ============================================================
 */
router.post("/assessments/:id/submit", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    try {
        const assessmentId = Number(req.params.id);
        const teacherId = req.user.id;
        // verify assessment belongs to teacher
        const assessment = await prisma.assessment.findFirst({
            where: {
                id: assessmentId,
                teacherId: teacherId
            }
        });
        if (!assessment) {
            return res.status(403).json({
                message: "You cannot submit this assessment"
            });
        }
        // update status
        const updated = await prisma.assessment.update({
            where: { id: assessmentId },
            data: {
                status: "SUBMITTED"
            }
        });
        res.json(updated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to submit assessment"
        });
    }
});
/**
 * ============================================================
 * DELETE
 * ============================================================
 */
router.delete("/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER, client_2.Role.ADMIN]), async (req, res) => {
    const id = Number(req.params.id);
    const assessment = await prisma.assessment.findUnique({
        where: { id }
    });
    if (!assessment) {
        return res.status(404).json({ message: "Not found" });
    }
    if (req.user.role === client_2.Role.TEACHER) {
        const assignment = await prisma.teacherSubject.findFirst({
            where: {
                teacherId: req.user.id,
                subjectId: assessment.subjectId,
                classId: assessment.classId
            }
        });
        if (!assignment) {
            return res.status(403).json({
                message: "You cannot delete another teacher's assessment"
            });
        }
    }
    await prisma.assessment.delete({ where: { id } });
    res.json({ message: "Deleted" });
});
