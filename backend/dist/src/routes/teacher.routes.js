"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const prisma_1 = __importDefault(require("../prisma"));
const teacher_controller_1 = require("../controllers/teacher.controller");
const teacher_controller_2 = require("../controllers/teacher.controller");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["TEACHER"]));
//
// 📚 TEACHER CORE ROUTES
//
router.get("/classes", teacher_controller_2.getTeacherClasses);
router.get("/subjects", teacher_controller_2.getTeacherSubjects);
router.get("/gradebook/:id", teacher_controller_2.getGradebook);
router.get("/class/:classId/students", teacher_controller_2.getClassStudents);
//
// 🧾 REPORTS
//
router.post("/report/comment", teacher_controller_2.saveReportComment);
router.get("/report/:classId", teacher_controller_2.getReportData);
//
// 🧱 FINAL GRADES (FIXED)
//
router.get("/final-grades/:classId", async (req, res) => {
    try {
        const { classId } = req.params;
        const { termId } = req.query;
        if (!termId) {
            return res.status(400).json({ message: "termId required" });
        }
        // ✅ REUSE EXISTING REPORT LOGIC
        const mockReq = {
            params: { classId },
            query: { termId },
            user: req.user,
        };
        let jsonData = [];
        const mockRes = {
            json: (data) => {
                jsonData = data;
            },
            status: () => mockRes,
        };
        await (0, teacher_controller_2.getReportData)(mockReq, mockRes);
        const results = jsonData.map((student) => {
            const subjects = student.subjects || [];
            if (subjects.length === 0) {
                return {
                    studentId: student.studentId,
                    name: student.name,
                    average: 0,
                    letter: "-",
                };
            }
            const avg = subjects.reduce((sum, s) => sum + (s.finalGrade || 0), 0) / subjects.length;
            const rounded = Number(avg.toFixed(1));
            const getLetter = (grade) => {
                if (grade >= 80)
                    return "A";
                if (grade >= 70)
                    return "B";
                if (grade >= 60)
                    return "C";
                if (grade >= 50)
                    return "D";
                return "E";
            };
            return {
                studentId: student.studentId,
                name: student.name,
                average: rounded,
                letter: getLetter(rounded),
            };
        });
        res.json(results);
    }
    catch (err) {
        console.error("FINAL GRADES ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
});
//
// 🧱 SCORES
//
router.post("/score", teacher_controller_2.upsertScore);
router.post("/score/bulk", teacher_controller_2.bulkUpdateScores);
//
// 🧱 ASSIGNMENTS
//
router.post("/class/:classId/assignment", teacher_controller_2.createAssignment);
router.post("/assignment", teacher_controller_2.createAssignment);
router.delete("/assignment/:id", teacher_controller_2.deleteAssignment);
router.put("/assignment/reorder", teacher_controller_2.reorderAssignments);
router.put("/assignment/:id", teacher_controller_2.updateAssignment);
router.post("/transcript/generate", teacher_controller_1.generateTranscripts);
//
// 🔒 LOCK / UNLOCK
//
router.put("/assignment/:id/lock", async (req, res) => {
    try {
        const { id } = req.params;
        const { isLocked } = req.body;
        const assignment = await prisma_1.default.assignment.update({
            where: { id: Number(id) },
            data: { isLocked },
        });
        res.json({ isLocked: assignment.isLocked });
    }
    catch (err) {
        console.error("Lock toggle error:", err);
        res.status(500).json({ message: "Failed to toggle lock" });
    }
});
//
// 🧱 TERMS
//
router.get("/terms/:classId", async (req, res) => {
    try {
        const classId = Number(req.params.classId);
        if (!classId) {
            return res.status(400).json({ error: "Invalid classId" });
        }
        // ✅ STEP 1 — VERIFY CLASS EXISTS
        const existingClass = await prisma_1.default.class.findUnique({
            where: { id: classId },
        });
        if (!existingClass) {
            return res.status(404).json({
                error: "Class not found",
            });
        }
        // ✅ STEP 2 — FETCH TERMS
        const terms = await prisma_1.default.term.findMany({
            where: { classId },
            orderBy: { createdAt: "asc" },
        });
        // ✅ STEP 3 — AUTO-CREATE IF EMPTY
        if (terms.length === 0) {
            console.warn("⚠️ No terms found — auto-creating one");
            const now = new Date();
            const newTerm = await prisma_1.default.term.create({
                data: {
                    name: "Term 1",
                    classId,
                    startDate: now,
                    endDate: new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()),
                    academicYear: `${now.getFullYear()}/${now.getFullYear() + 1}`,
                },
            });
            return res.json([newTerm]);
        }
        res.json(terms);
    }
    catch (err) {
        console.error("Fetch terms error:", err);
        res.status(500).json({ error: "Failed to fetch terms" });
    }
});
exports.default = router;
