import { Router } from "express";
import { prisma } from "../prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Role, AssessmentType } from "@prisma/client";

const router = Router();

/**
 * 📘 Get teacher assignments (subjects + classes)
 */
router.get(
  "/teacher/assignments",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req: any, res) => {
    try {
      const teacherId = req.user?.id;

      const assignments = await prisma.teacherSubject.findMany({
        where: {
          teacherId: teacherId,
          isActive: true,
          class: { isArchived: false },
        },
        include: {
          subject: true,
          class: true,
        },
      });

      return res.status(200).json(assignments);
    } catch (error) {
      console.error("Error fetching teacher assignments:", error);

      return res.status(500).json({
        error: "Failed to fetch teacher assignments",
      });
    }
  }
);

/**
 * 🏫 Get unique classes for a teacher
 */
router.get(
  "/teacher/classes",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req: any, res) => {
    try {
      const teacherId = req.user?.id;

      const teacherSubjects = await prisma.teacherSubject.findMany({
        where: {
          teacherId: teacherId,
          isActive: true,
          class: { isArchived: false },
        },
        include: {
          class: true,
        },
      });

      const uniqueClassesMap = new Map<number, any>();

      teacherSubjects.forEach((ts) => {
        if (ts.class) {
          uniqueClassesMap.set(ts.class.id, ts.class);
        }
      });

      const classes = Array.from(uniqueClassesMap.values());

      return res.status(200).json(classes);
    } catch (error) {
      console.error("Error fetching teacher classes:", error);

      return res.status(500).json({
        error: "Failed to fetch teacher classes",
      });
    }
  }
);

/**
 * 👨‍🎓 Get students in a class (for teacher)
 */
router.get(
  "/teacher/class/:id/students",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req: any, res) => {
    try {
      const classId = Number(req.params.id);

      const students = await prisma.student.findMany({
        where: {
          classId: classId,
          isArchived: false,
        },
      });

      return res.status(200).json(students);
    } catch (error) {
      console.error("Error fetching class students:", error);

      return res.status(200).json([]);
    }
  }
);

/**
 * 📊 Get student gradebook (assignments + scores)
 */
router.get(
  "/teacher/student/:id/gradebook",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req: any, res) => {
    try {
      const studentId = Number(req.params.id);

      const scores = await prisma.assessmentScore.findMany({
        where: {
          studentId: studentId,
        },
        include: {
          assessment: true,
        },
      });

      // ✅ FIXED: include assessmentId
      const result = scores.map((s) => ({
        title: s.assessment.title,
        score: s.score,
        assessmentId: s.assessmentId, // 🔥 REQUIRED for inline editing
      }));

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching gradebook:", error);

      return res.status(200).json([]);
    }
  }
);

/**
 * 🚀 NEW: Create assignment FOR A CLASS (Phase 2 CORE)
 */
router.post(
  "/teacher/class/:id/assignment",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req: any, res) => {
    try {
      const teacherId = req.user?.id;
      const classId = Number(req.params.id);
      const { title, type, maxScore } = req.body;

      const teacherSubject = await prisma.teacherSubject.findFirst({
        where: {
          teacherId,
          classId,
          isActive: true,
          class: { isArchived: false },
        },
      });

      if (!teacherSubject) {
        return res.status(403).json({
          message: "Unauthorized for this class",
        });
      }

      const students = await prisma.student.findMany({
        where: {
          classId,
          isArchived: false,
        },
      });

      if (students.length === 0) {
        return res.status(200).json({
          message: "No students in class",
        });
      }

      const term = await prisma.term.findFirst();

      if (!term) {
        return res.status(200).json({
          message: "No term found",
        });
      }

      const assessment = await prisma.assessment.create({
        data: {
          title,
          type: AssessmentType[type as keyof typeof AssessmentType],
          maxScore: Number(maxScore),
          classId,
          subjectId: teacherSubject.subjectId,
          termId: term.id,
          date: new Date(),
          weight: 1,
        },
      });

      const scoreData = students.map((s) => ({
        studentId: s.id,
        assessmentId: assessment.id,
        score: 0,
      }));

      await prisma.assessmentScore.createMany({
        data: scoreData,
      });

      return res.status(200).json({
        message: "Assignment created for class",
      });
    } catch (err) {
      console.error("Error creating class assignment:", err);

      return res.status(500).json({
        message: "Failed to create assignment",
      });
    }
  }
);

/**
 * ⚠️ OLD: Create assignment FOR a specific student (TO BE REMOVED)
 */
router.post(
  "/teacher/student/:id/assignment",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req: any, res) => {
    try {
      const studentId = Number(req.params.id);
      const { title, type, maxScore } = req.body;

      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        return res.status(200).json({ message: "Student not found" });
      }
      if (student.classId === null) {
        return res.status(409).json({ message: "Student has no current class" });
      }
      const classId = student.classId;

      const teacherSubject = await prisma.teacherSubject.findFirst({
        where: {
          classId,
          teacherId: req.user!.id,
          isActive: true,
          class: { isArchived: false },
        },
      });

      if (!teacherSubject) {
        return res.status(200).json({ message: "No subject found" });
      }

      const term = await prisma.term.findFirst({
        where: { classId },
        orderBy: [{ startDate: "desc" }, { id: "desc" }],
      });

      if (!term) {
        return res.status(200).json({ message: "No term found" });
      }

      const assessment = await prisma.assessment.create({
        data: {
          title,
          type: AssessmentType[type as keyof typeof AssessmentType],
          maxScore: Number(maxScore),
          classId,
          subjectId: teacherSubject.subjectId,
          termId: term.id,
          date: new Date(),
          weight: 1,
        },
      });

      await prisma.assessmentScore.create({
        data: {
          studentId,
          assessmentId: assessment.id,
          score: 0,
        },
      });

      return res.status(200).json({ message: "Created" });
    } catch (err) {
      console.error("Error creating assignment:", err);
      return res.status(200).json({});
    }
  }
);

/**
 * ✏️ NEW: Update score (INLINE EDITING)
 */
router.put(
  "/teacher/score",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req: any, res) => {
    try {
      const { studentId, assessmentId, score } = req.body;

      await prisma.assessmentScore.updateMany({
        where: {
          studentId: Number(studentId),
          assessmentId: Number(assessmentId),
        },
        data: {
          score: Number(score),
        },
      });

      return res.status(200).json({ message: "Updated" });
    } catch (err) {
      console.error("Error updating score:", err);
      return res.status(500).json({});
    }
  }
);

export default router;
