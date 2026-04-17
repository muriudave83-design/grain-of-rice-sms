import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import prisma from "../prisma";
import { generateTranscripts } from "../controllers/teacher.controller";

import {
  getTeacherSubjects,
  getTeacherClasses,
  getGradebook,
  upsertScore,
  createAssignment,
  deleteAssignment,
  updateAssignment,
  getClassStudents,
  reorderAssignments,
  bulkUpdateScores,
  getReportData,
  saveReportComment,
} from "../controllers/teacher.controller";

const router = Router();

router.use(authenticate, requireRole(["TEACHER"]));

//
// 📚 TEACHER CORE ROUTES
//

// ✅ GET teacher classes
router.get("/classes", getTeacherClasses);

// ✅ GET teacher subjects
router.get("/subjects", getTeacherSubjects);

// ✅ GET gradebook detail
router.get("/gradebook/:id", getGradebook);

// ✅ GET class students
router.get("/class/:classId/students", getClassStudents);

//
// 🧾 REPORTS
//
router.post("/report/comment", saveReportComment);

// 🧱 NEW — GET report data
router.get("/report/:classId", getReportData);

//
// 🧱 SCORES
//

// ✅ POST score (create/update single)
router.post("/score", upsertScore);

// 🧱 NEW — BULK SCORE UPDATE 🚀
router.post("/score/bulk", bulkUpdateScores);

//
// 🧱 PHASE 5 — ASSIGNMENTS
//

// ✅ CREATE assignment (by class)
router.post("/class/:classId/assignment", createAssignment);

// ✅ CREATE assignment (general)
router.post("/assignment", createAssignment);

// ✅ DELETE assignment
router.delete("/assignment/:id", deleteAssignment);

// ✅ REORDER assignments
router.put("/assignment/reorder", reorderAssignments);

// ✅ UPDATE assignment
router.put("/assignment/:id", updateAssignment);

router.post("/transcript/generate", generateTranscripts);

//
// 🔒 LOCK / UNLOCK ASSIGNMENT
//
router.put("/assignment/:id/lock", async (req, res) => {
  try {
    const { id } = req.params;
    const { isLocked } = req.body;

    const assignment = await prisma.assignment.update({
      where: { id: Number(id) },
      data: { isLocked },
    });

    res.json({ isLocked: assignment.isLocked });
  } catch (err) {
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

    const terms = await prisma.term.findMany({
      where: {
        classId: classId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json(terms);
  } catch (err) {
    console.error("Fetch terms error:", err);
    res.status(500).json({ error: "Failed to fetch terms" });
  }
});

export default router;