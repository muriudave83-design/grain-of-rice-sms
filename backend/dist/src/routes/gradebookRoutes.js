"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/gradebookRoutes.ts
const express_1 = require("express");
const client_1 = require("../prisma/client");
const gradebookController_1 = require("../controllers/gradebookController");
const gradebookGrid_controller_1 = require("../controllers/gradebookGrid.controller");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const client_2 = require("@prisma/client");
const router = (0, express_1.Router)();
// ======================================================
// 🟢 Gradebook Grid (Teacher)
// GET /api/gradebook?classId=&subjectId=
// ======================================================
router.get("/", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), gradebookGrid_controller_1.getGradebookGrid);
// ======================================================
// 🟢 Save or Update Score (Teacher)
// POST /api/gradebook/score
// ======================================================
router.post("/score", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), async (req, res) => {
    try {
        const { assessmentId, studentId, score } = req.body;
        if (!assessmentId ||
            !studentId ||
            score === undefined ||
            score === null) {
            return res.status(400).json({
                message: "assessmentId, studentId, and score required",
            });
        }
        const saved = await client_1.prisma.assessmentScore.upsert({
            where: {
                assessmentId_studentId: {
                    assessmentId: Number(assessmentId),
                    studentId: Number(studentId),
                },
            },
            update: {
                score: Number(score),
            },
            create: {
                assessmentId: Number(assessmentId),
                studentId: Number(studentId),
                score: Number(score),
            },
        });
        return res.json(saved);
    }
    catch (err) {
        console.error("Failed to save score:", err);
        return res.status(500).json({
            message: "Failed to save score",
        });
    }
});
// ======================================================
// 🟢 Teacher Summary View
// GET /api/gradebook/teacher/subject/:subjectId
// ======================================================
router.get("/teacher/subject/:subjectId", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.TEACHER]), gradebookController_1.getTeacherGradebook);
// ======================================================
// 🟢 Parent View (Single Student)
// GET /api/gradebook/parent/student/:studentId
// ======================================================
router.get("/parent/student/:studentId", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.PARENT]), gradebookController_1.getParentGradebook);
// ======================================================
// 🟢 Admin Overview
// GET /api/gradebook/admin/overview
// ======================================================
router.get("/admin/overview", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.ADMIN]), gradebookController_1.getAdminOverview);
exports.default = router;
