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
// ✅ GET teacher classes
router.get("/classes", teacher_controller_2.getTeacherClasses);
// ✅ GET teacher subjects
router.get("/subjects", teacher_controller_2.getTeacherSubjects);
// ✅ GET gradebook detail
router.get("/gradebook/:id", teacher_controller_2.getGradebook);
// ✅ GET class students
router.get("/class/:classId/students", teacher_controller_2.getClassStudents);
//
// 🧾 REPORTS
//
router.post("/report/comment", teacher_controller_2.saveReportComment);
// 🧱 NEW — GET report data
router.get("/report/:classId", teacher_controller_2.getReportData);
//
// 🧱 SCORES
//
// ✅ POST score (create/update single)
router.post("/score", teacher_controller_2.upsertScore);
// 🧱 NEW — BULK SCORE UPDATE 🚀
router.post("/score/bulk", teacher_controller_2.bulkUpdateScores);
//
// 🧱 PHASE 5 — ASSIGNMENTS
//
// ✅ CREATE assignment (by class)
router.post("/class/:classId/assignment", teacher_controller_2.createAssignment);
// ✅ CREATE assignment (general)
router.post("/assignment", teacher_controller_2.createAssignment);
// ✅ DELETE assignment
router.delete("/assignment/:id", teacher_controller_2.deleteAssignment);
// ✅ REORDER assignments
router.put("/assignment/reorder", teacher_controller_2.reorderAssignments);
// ✅ UPDATE assignment
router.put("/assignment/:id", teacher_controller_2.updateAssignment);
router.post("/transcript/generate", teacher_controller_1.generateTranscripts);
//
// 🔒 LOCK / UNLOCK ASSIGNMENT
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
// 🧱 STEP 5 — TERMS ROUTE (NEW)
//
router.get("/terms/:classId", async (req, res) => {
    try {
        const classId = Number(req.params.classId);
        if (!classId) {
            return res.status(400).json({ error: "Invalid classId" });
        }
        const terms = await prisma_1.default.term.findMany({
            where: {
                classId: classId,
            },
            orderBy: {
                createdAt: "asc",
            },
        });
        res.json(terms);
    }
    catch (err) {
        console.error("Fetch terms error:", err);
        res.status(500).json({ error: "Failed to fetch terms" });
    }
});
exports.default = router;
