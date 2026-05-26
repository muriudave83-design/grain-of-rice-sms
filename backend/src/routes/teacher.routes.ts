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

router.get("/classes", getTeacherClasses);
router.get("/subjects", getTeacherSubjects);
router.get("/gradebook/:id", getGradebook);
router.get("/class/:classId/students", getClassStudents);

//
// 🧾 REPORTS
//
router.post("/report/comment", saveReportComment);
router.get("/report/:classId", getReportData);

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
    const mockReq: any = {
      params: { classId },
      query: { termId },
      user: req.user,
    };

    let jsonData: any = [];

    const mockRes: any = {
      json: (data: any) => {
        jsonData = data;
      },
      status: () => mockRes,
    };

    await getReportData(mockReq, mockRes);

    const results = jsonData.map((student: any) => {
      const subjects = student.subjects || [];

      if (subjects.length === 0) {
        return {
          studentId: student.studentId,
          name: student.name,
          average: 0,
          letter: "-",
        };
      }

      const avg =
        subjects.reduce(
          (sum: number, s: any) => sum + (s.finalGrade || 0),
          0
        ) / subjects.length;
              const rounded = Number(avg.toFixed(1));

      const getLetter = (grade: number) => {
        if (grade >= 80) return "A";
        if (grade >= 70) return "B";
        if (grade >= 60) return "C";
        if (grade >= 50) return "D";
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

  } catch (err) {
    console.error("FINAL GRADES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

//
// 🧱 SCORES
//
router.post("/score", upsertScore);
router.post("/score/bulk", bulkUpdateScores);

//
// 🧱 ASSIGNMENTS
//
router.post("/class/:classId/assignment", createAssignment);
router.post("/assignment", createAssignment);
router.delete("/assignment/:id", deleteAssignment);
router.put("/assignment/reorder", reorderAssignments);
router.put("/assignment/:id", updateAssignment);

router.post("/transcript/generate", generateTranscripts);

//
// 🔒 LOCK / UNLOCK
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
// 🧱 TERMS
//
router.get("/terms/:classId", async (req, res) => {
  try {
    const classId = Number(req.params.classId);

    if (!classId) {
      return res.status(400).json({ error: "Invalid classId" });
    }

    // ✅ STEP 1 — VERIFY CLASS EXISTS
    const existingClass = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!existingClass) {
      return res.status(404).json({
        error: "Class not found",
      });
    }

    // ✅ STEP 2 — FETCH TERMS
    const terms = await prisma.term.findMany({
      orderBy: [
        { academicYear: "asc" },
        { createdAt: "asc" },
      ],
    });

    console.log("📚 GLOBAL TERMS:", terms);

    // ✅ STEP 3 — AUTO-CREATE IF EMPTY
    if (terms.length === 0) {
      console.warn("⚠️ No terms found — auto-creating one");

      const now = new Date();

      const newTerm = await prisma.term.create({
        data: {
          name: "Term 1",
          classId,

          startDate: now,
          endDate: new Date(
            now.getFullYear(),
            now.getMonth() + 3,
            now.getDate()
          ),
          academicYear: `${now.getFullYear()}/${now.getFullYear() + 1}`,
        },
      });

      return res.json([newTerm]);
    }

    res.json(terms);
  } catch (err) {
    console.error("Fetch terms error:", err);
    res.status(500).json({ error: "Failed to fetch terms" });
  }
});

export default router;