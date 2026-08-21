import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import prisma from "../prisma";
import { generateTranscripts } from "../controllers/teacher.controller";
import { getGradeDescription } from "../utils/gradeDescriptions";

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
  publishFinalGrades,
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
    let responseStatus = 200;

    const mockRes: any = {
      json: (data: any) => {
        jsonData = data;
        return mockRes;
      },
      status: (status: number) => {
        responseStatus = status;
        return mockRes;
      },
    };

    await getReportData(mockReq, mockRes);

    if (!Array.isArray(jsonData)) {
      return res.status(responseStatus).json(jsonData);
    }

    const results = jsonData.map((student: any) => {
      const subjects = student.subjects || [];

      if (subjects.length === 0) {
        return {
          studentId: student.studentId,
          name: student.name,
          admissionNo: student.admissionNo,
          average: 0,
          letter: "-",
          gradeDescription: null,
          subjects: [],
          position: null,
          remarks: "",
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
        return "F";
      };

      const letter = getLetter(rounded);
      return {
        studentId: student.studentId,
        name: student.name,
        admissionNo: student.admissionNo,
        average: rounded,
        letter,
        gradeDescription: getGradeDescription(letter),
        subjects: subjects.map((subject: any) => subject.subjectName),
        position: null,
        remarks: "",
      };
    });

    const ranked = [...results].sort((a, b) => b.average - a.average);
    const positions = new Map<number, number>();
    ranked.forEach((student, index) => {
      const previous = ranked[index - 1];
      const position = previous && previous.average === student.average
        ? positions.get(previous.studentId)!
        : index + 1;
      positions.set(student.studentId, position);
    });

    res.json(results.map((student: any) => ({
      ...student,
      position: positions.get(student.studentId) ?? null,
    })));

  } catch (err) {
    console.error("FINAL GRADES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/final-grades/:classId/publish", publishFinalGrades);

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

    if (typeof isLocked !== "boolean") {
      return res.status(400).json({ message: "isLocked must be a boolean" });
    }

    const owned = await prisma.assignment.findFirst({
      where: {
        id: Number(id),
        teacherSubject: { teacherId: req.user!.id },
      },
      select: {
        id: true,
        termId: true,
        teacherSubject: { select: { subjectId: true, classId: true } },
      },
    });
    if (!owned) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (!isLocked) {
      const publishedGrade = await prisma.grade.findFirst({
        where: {
          subjectId: owned.teacherSubject.subjectId,
          termId: owned.termId,
          student: { classId: owned.teacherSubject.classId },
        },
        select: { id: true },
      });
      if (publishedGrade) {
        return res.status(409).json({
          message: "Published final-grade assignments cannot be unlocked",
        });
      }
    }

    const assignment = await prisma.assignment.update({
      where: { id: owned.id },
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
    const assigned = await prisma.teacherSubject.findFirst({
      where: { classId, teacherId: req.user!.id },
      select: { id: true },
    });

    if (!assigned) {
      return res.status(403).json({ error: "Not assigned to this class" });
    }

    // ✅ STEP 2 — FETCH TERMS
    const terms = await prisma.term.findMany({
      where: { classId },
      orderBy: [
        { academicYear: "asc" },
        { createdAt: "asc" },
      ],
    });

    if (terms.length === 0) {
      return res.status(404).json({
        error: "No term is configured for this class. Contact an administrator.",
      });
    }

    res.json(terms);
  } catch (err) {
    console.error("Fetch terms error:", err);
    res.status(500).json({ error: "Failed to fetch terms" });
  }
});

export default router;
