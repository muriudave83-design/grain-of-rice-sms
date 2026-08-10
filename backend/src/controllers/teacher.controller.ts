import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getGradeDescription } from "../utils/gradeDescriptions";
import { AssessmentType } from "@prisma/client";
import { summarizeAttendanceDays } from "../services/attendance/attendanceDomain";

const prisma = new PrismaClient();

// 🧠 HELPER — VALIDATE SCORE
const isValidScore = (score: any) => {
  const n = Number(score);
  return !isNaN(n) && n >= 0;
};

// 🧠 HELPER — DEDUPLICATE
const dedupeUpdates = (updates: any[]) => {
  const map = new Map();
  updates.forEach((u) => {
    const key = `${u.studentId}-${u.assignmentId}`;
    map.set(key, u);
  });
  return Array.from(map.values());
};

//
// 🧠 ✅ SINGLE SOURCE OF TRUTH (GRADEBOOK ENGINE)
//

const calculateFinalGradeForStudent = (
  studentId: number,
  assignments: any[]
) => {
  let total = 0;
  let totalWeight = 0;

  assignments.forEach((assignment) => {
    const scoreObj = assignment.scores.find(
      (s: any) => s.studentId === studentId
    );

    if (!scoreObj) return;

    const score = Number(scoreObj.score);
    if (isNaN(score)) return;

    // 🔥 UPDATED: use maxPoints instead of maxScore
    const maxPoints = assignment.maxPoints || 100;
    const weight = assignment.weight ?? 1;

    const percentage = (score / maxPoints) * 100;

    total += percentage * weight;
    totalWeight += weight;
  });

  if (totalWeight === 0) return 0;

  return total / totalWeight;
};

const getLetterGrade = (avg: number) => {
  if (avg >= 80) return "A";
  if (avg >= 70) return "B";
  if (avg >= 60) return "C";
  if (avg >= 50) return "D";
  return "F";
};

//
// 📚 TEACHER CORE
//

export const getTeacherClasses = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user.id;

    const teacherSubjects = await prisma.teacherSubject.findMany({
      where: { teacherId },
      include: { class: true },
    });

    const classesMap = new Map();

    teacherSubjects.forEach((ts) => {
      if (ts.class) {
        classesMap.set(ts.class.id, ts.class);
      }
    });

    res.json(Array.from(classesMap.values()));
  } catch (error) {
    console.error("GET TEACHER CLASSES ERROR:", error);
    res.status(500).json({ message: "Failed to fetch classes" });
  }
};

export const getTeacherSubjects = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user.id;

    const subjects = await prisma.teacherSubject.findMany({
      where: { teacherId },
      include: {
        class: true,
        subject: true,
        assignments: true,
      },
    });

    res.json(subjects);
  } catch (error) {
    console.error("GET TEACHER SUBJECTS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch teacher subjects" });
  }
};

export const getGradebook = async (req: Request, res: Response) => {
  const { id } = req.params;
  const termId = req.query.termId ? Number(req.query.termId) : null;

  try {
    const gradebook = await prisma.teacherSubject.findUnique({
      where: { id: Number(id) },
      include: {
        class: {
          include: { students: true },
        },
        subject: true,
        assignments: termId
          ? {
              where: { termId },
              orderBy: { position: "asc" },
              include: { scores: true },
            }
          : false,
      },
    });

    if (!gradebook) {
      return res.status(404).json({ message: "Not found" });
    }

    return res.json({
      ...gradebook,
      assignments: gradebook.assignments || [],
    });

  } catch (err) {
    console.error("GET GRADEBOOK ERROR:", err);
    res.status(500).json({ message: "Error fetching gradebook" });
  }
};

export const getClassStudents = async (req: Request, res: Response) => {
  const { classId } = req.params;

  try {
    const students = await prisma.student.findMany({
      where: { classId: Number(classId) },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    res.json(students);
  } catch (err) {
    console.error("GET CLASS STUDENTS ERROR:", err);
    res.status(500).json({ message: "Error fetching students" });
  }
};

//
// 🧱 SCORES
//

export const upsertScore = async (req: Request, res: Response) => {
  const { studentId, assignmentId, score } = req.body;

  const scoreNumber = Number(score);
  if (!isValidScore(scoreNumber)) {
    return res.status(400).json({ message: "Invalid score" });
  }

  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return res.status(404).json({
        message: "Assignment not found",
      });
    }

    if (assignment.isLocked) {
      return res.status(403).json({
        message: "Assignment is locked",
      });
    }

    const existing = await prisma.score.findFirst({
      where: { studentId, assignmentId },
    });

    const result = existing
      ? await prisma.score.update({
          where: { id: existing.id },
          data: {
            score: scoreNumber,
            maxPoints: assignment.maxPoints, // ✅ ADD THIS
          },
        })
      : await prisma.score.create({
          data: {
            studentId,
            assignmentId,
            score: scoreNumber,
            maxPoints: assignment.maxPoints, // ✅ ADD THIS
          },
        });

    res.json(result);
  } catch (err) {
    console.error("UPSERT SCORE ERROR:", err);
    res.status(500).json({ message: "Error saving score" });
  }
};

//
// 🧱 ASSIGNMENTS (🔥 UPDATED CORE)
//

export const createAssignment = async (req: Request, res: Response) => {
  const {
    title,
    teacherSubjectId,
    weight,
    type,
    termId,

    // 🔥 NEW FIELDS
    maxPoints,
    dateAssigned,
    dueDate,
  } = req.body;

  // 🔥 REQUIRED VALIDATION (as instructed)
  if (!title) {
    return res.status(400).json({ error: "Title required" });
  }

  if (!type) {
    return res.status(400).json({ error: "Type required" });
  }

  if (!teacherSubjectId || !termId) {
    return res.status(400).json({ message: "Missing fields" });
  }

  // 🔥 OPTIONAL VALIDATION
  if (maxPoints && isNaN(maxPoints)) {
    return res
      .status(400)
      .json({ error: "maxPoints must be a number" });
  }

  try {
    // 🔥 UPDATED ENUM (aligned with new system)
    const validTypes = ["ASSIGNMENT", "TEST", "PROJECT"];
    const normalizedType =
      typeof type === "string" ? type.toUpperCase() : null;

      const allowedTypes = ["ASSIGNMENT", "TEST", "PROJECT"];
      if (!normalizedType || !allowedTypes.includes(normalizedType)) {
        return res.status(400).json({
          error: "Invalid assignment type",
        });
      }

    const tsId = Number(teacherSubjectId);

    const last = await prisma.assignment.findFirst({
      where: {
        teacherSubjectId: tsId,
        termId: Number(termId),
      },
      orderBy: { position: "desc" },
    });

    const position = last ? last.position + 1 : 0;

    const assignment = await prisma.assignment.create({
      data: {
        title,
        teacherSubjectId: tsId,
        termId: Number(termId),

        type: normalizedType as AssessmentType,

        // 🔥 NEW STANDARDIZED FIELDS
        maxPoints: maxPoints ? parseFloat(maxPoints) : 100,
        dateAssigned: dateAssigned ? new Date(dateAssigned) : null,
        dueDate: dueDate ? new Date(dueDate) : null,

        // Existing fields (unchanged)
        position,
        ...(weight !== undefined && { weight }),
      },
    });

    res.json(assignment);
  } catch (err) {
    console.error("CREATE ASSIGNMENT ERROR:", err);
    res.status(500).json({ message: "Error creating assignment" });
  }
};
export const deleteAssignment = async (req: Request, res: Response) => {
  try {
    await prisma.assignment.delete({
      where: { id: Number(req.params.id) },
    });

    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE ASSIGNMENT ERROR:", err);
    res.status(500).json({ message: "Error deleting assignment" });
  }
};

export const updateAssignment = async (req: Request, res: Response) => {
  try {
    const updated = await prisma.assignment.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(req.body.title !== undefined && { title: req.body.title }),
        ...(req.body.weight !== undefined && { weight: req.body.weight }),

        // 🔥 OPTIONAL: allow updating new fields too
        ...(req.body.maxPoints !== undefined && {
          maxPoints: Number(req.body.maxPoints),
        }),
        ...(req.body.dateAssigned !== undefined && {
          dateAssigned: req.body.dateAssigned
            ? new Date(req.body.dateAssigned)
            : null,
        }),
        ...(req.body.dueDate !== undefined && {
          dueDate: req.body.dueDate
            ? new Date(req.body.dueDate)
            : null,
        }),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("UPDATE ASSIGNMENT ERROR:", err);
    res.status(500).json({ message: "Error updating assignment" });
  }
};

export const reorderAssignments = async (req: Request, res: Response) => {
  try {
    const { assignments } = req.body;

    await prisma.$transaction(
      assignments.map((a: { id: number; position: number }) =>
        prisma.assignment.update({
          where: { id: a.id },
          data: { position: a.position },
        })
      )
    );

    res.json({ success: true });
  } catch (err) {
    console.error("REORDER ASSIGNMENTS ERROR:", err);
    res.status(500).json({ error: "Failed to reorder" });
  }
};

export const toggleAssignmentLock = async (req: Request, res: Response) => {
  try {
    const assignment = await prisma.assignment.update({
      where: { id: Number(req.params.id) },
      data: { isLocked: req.body.isLocked },
    });

    res.json(assignment);
  } catch (err) {
    console.error("Lock toggle failed:", err);
    res.status(500).json({ error: "Failed to toggle lock" });
  }
};

//
// 🧱 BULK UPDATE SCORES (CSV IMPORT 🚀 WITH PREVIEW MODE)
//

export const bulkUpdateScores = async (req: Request, res: Response) => {
  try {
    const { updates, mode = "commit" } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: "No updates provided" });
    }

    const uniqueUpdates = dedupeUpdates(updates);

    const assignmentIds = [
      ...new Set(uniqueUpdates.map((u: any) => u.assignmentId)),
    ];

    const assignments = await prisma.assignment.findMany({
      where: { id: { in: assignmentIds } },
      select: { id: true, isLocked: true },
    });

    const assignmentMap = new Map(
      assignments.map((a) => [a.id, a])
    );

    let updated = 0;
    let skippedLocked = 0;
    let invalid = 0;

    const preview: any[] = [];
    const validUpdates: any[] = [];

    uniqueUpdates.forEach((u: any) => {
      const assignment = assignmentMap.get(u.assignmentId);
      const score = Number(u.score);

      let status = "valid";

      if (!assignment) {
        status = "invalid-assignment";
        invalid++;
      } else if (assignment.isLocked) {
        status = "locked";
        skippedLocked++;
      } else if (!isValidScore(score)) {
        status = "invalid-score";
        invalid++;
      } else {
        validUpdates.push({
          studentId: u.studentId,
          assignmentId: u.assignmentId,
          score,
        });
      }

      preview.push({
        ...u,
        status,
      });
    });

    if (mode === "preview") {
      return res.json({
        success: true,
        mode: "preview",
        total: updates.length,
        valid: validUpdates.length,
        skippedLocked,
        invalid,
        preview,
      });
    }

    await prisma.$transaction(
      validUpdates.map((u) =>
        prisma.score.upsert({
          where: {
            studentId_assignmentId: {
              studentId: u.studentId,
              assignmentId: u.assignmentId,
            },
          },
          update: { score: u.score },
          create: u,
        })
      )
    );

    updated = validUpdates.length;

    res.json({
      success: true,
      mode: "commit",
      updated,
      skippedLocked,
      invalid,
      totalReceived: updates.length,
    });
  } catch (err) {
    console.error("Bulk update failed:", err);
    res.status(500).json({ error: "Bulk update failed" });
  }
};

//
// 🧾 REPORTS — NOW TERM-AWARE + ATTENDANCE ✅
//

export const getReportData = async (req: Request, res: Response) => {
  try {
    const rawClassId = req.params.classId;
    const termId = Number(req.query.termId);

    const classId = Number(rawClassId);

    if (!rawClassId || isNaN(classId)) {
      return res.status(400).json({
        error: "Invalid or missing classId param",
      });
    }

    if (!termId) {
      return res.status(400).json({
        error: "termId required",
      });
    }

    const teacherId = (req as any).user.id;

    /**
     * STUDENTS
     */
    const students = await prisma.student.findMany({
      where: { classId },
    });

    /**
     * SUBJECTS + ASSIGNMENTS
     */
    const subjects = await prisma.teacherSubject.findMany({
      where: {
        classId,
        teacherId,
      },
      include: {
        subject: true,
        assignments: {
          where: {
            termId: termId,
          },
          include: { scores: true },
        },
      },
    });

    /**
     * COMMENTS
     */
    const comments = await prisma.reportComment.findMany({
      where: {
        student: { classId },
      },
    });

    /**
     * TERM
     */
    const term = await prisma.term.findUnique({
      where: { id: termId },
    });

    if (!term) {
      return res.status(404).json({
        error: "Term not found",
      });
    }

    /**
     * BUILD REPORTS
     */
    const result = await Promise.all(
      students.map(async (student) => {

        /**
         * SUBJECT RESULTS
         */
        const subjectResults = subjects.map((ts) => {
          const assignments = ts.assignments ?? [];

          const avg = calculateFinalGradeForStudent(
            student.id,
            assignments
          );

          const letter = getLetterGrade(avg);

          const commentObj = comments.find(
            (c) =>
              c.studentId === student.id &&
              c.teacherSubjectId === ts.id
          );

          return {
            teacherSubjectId: ts.id,
            subjectName: ts.subject.name,
            finalGrade: Number(avg.toFixed(1)),
            letter,
            gradeDescription: getGradeDescription(letter),
            comment: commentObj?.comment || "",
          };
        });

        /**
         * ATTENDANCE
         */
        const attendanceEntries =
          await prisma.attendanceEntry.findMany({
            where: {
              studentId: student.id,
              session: {
                date: {
                  gte: new Date(term.startDate),
                  lte: new Date(term.endDate),
                },
              },
            },
            include: {
              session: true,
            },
          });

        console.log(
          "📊 ATTENDANCE FOR STUDENT:",
          student.id,
          attendanceEntries.length
        );

        const dailyAttendance = summarizeAttendanceDays(attendanceEntries.map((entry) => ({
          period: entry.period,
          status: entry.status,
          date: entry.session.date,
        })));
        const { present, absent, late } = dailyAttendance;
        const totalAttendance = dailyAttendance.completedDays;

        const attendanceRate =
          totalAttendance > 0
            ? Math.round(
                ((totalAttendance - absent) / totalAttendance) * 100
              )
            : 0;

        return {
          studentId: student.id,
          name: `${student.firstName} ${student.lastName}`,
          subjects: subjectResults,

          present,
          absent,
          late,
          attendanceRate,
        };
      })
    );

    res.json(result);

  } catch (err) {
    console.error("REPORT ERROR FULL STACK:", err);

    res.status(500).json({
      error: "Failed to generate report",
    });
  }
};

//
// ✅ SAVE COMMENT
//

export const saveReportComment = async (req: Request, res: Response) => {
  try {
    const { studentId, teacherSubjectId, comment } = req.body;

    const saved = await prisma.reportComment.upsert({
      where: {
        studentId_teacherSubjectId_termId: {
          studentId,
          teacherSubjectId,
          termId: 0
        },
      },
      update: { comment },
      create: { studentId, teacherSubjectId, comment },
    });

    res.json(saved);
  } catch (err) {
    console.error("Comment save failed:", err);
    res.status(500).json({ error: "Failed to save comment" });
  }
};

//
// 🧾 TRANSCRIPTS — NOW TERM-AWARE ✅
//

export const generateTranscripts = async (req: Request, res: Response) => {
  const { classId, termId } = req.body;

  if (!termId) {
    return res.status(400).json({
      error: "termId required",
    });
  }

  try {
    const students = await prisma.student.findMany({
      where: { classId },
    });

    const subjects = await prisma.teacherSubject.findMany({
      where: { classId },
      include: {
        subject: true,
        assignments: {
          where: {
            termId: Number(termId),
          },
          include: { scores: true },
        },
      },
    });

    for (const student of students) {
      const existing = await prisma.transcript.findUnique({
        where: {
          studentId_classId_termId: {
            studentId: student.id,
            classId,
            termId: Number(termId),
          },
        },
      });

      if (existing) continue;

      const transcript = await prisma.transcript.create({
        data: {
          studentId: student.id,
          classId,
          termId: Number(termId),
        },
      });

      for (const ts of subjects) {
        // 🔥 Uses UPDATED grading logic
        const avg = calculateFinalGradeForStudent(
          student.id,
          ts.assignments
        );

        await prisma.transcriptEntry.create({
          data: {
            transcriptId: transcript.id,
            subjectName: ts.subject.name,
            finalGrade: Number(avg.toFixed(1)),
            letterGrade: getLetterGrade(avg),
          },
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("TRANSCRIPT ERROR:", err);
    res.status(500).json({ message: "Failed to generate transcripts" });
  }
};
