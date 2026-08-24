import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getGradeDescription, getLetterGrade } from "../utils/gradeDescriptions";
import { AssessmentType } from "@prisma/client";
import { summarizeAttendanceDays } from "../services/attendance/attendanceDomain";
import { assembleClassSubjectResults, indexReportComments } from "../services/reportData.service";
import { deleteOwnedAssignment } from "../services/assignmentDeletion.service";

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

export const calculateFinalGradeForStudent = (
  studentId: number,
  assignments: any[]
) => {
  let total = 0;
  let totalWeight = 0;

  if (assignments.length === 0) return null;

  for (const assignment of assignments) {
    const scoreObj = assignment.scores.find(
      (s: any) => s.studentId === studentId
    );

    if (!scoreObj || scoreObj.score === null || scoreObj.score === undefined || scoreObj.score === "") return null;

    const score = Number(scoreObj.score);
    if (isNaN(score)) return null;

    // 🔥 UPDATED: use maxPoints instead of maxScore
    const maxPoints = assignment.maxPoints ?? 100;
    if (maxPoints <= 0) return null;
    const weight = assignment.weight ?? 1;

    const percentage = (score / maxPoints) * 100;

    total += percentage * weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0) return null;

  return total / totalWeight;
};

//
// 📚 TEACHER CORE
//

export const getTeacherClasses = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user.id;

    const teacherSubjects = await prisma.teacherSubject.findMany({
      where: { teacherId, isActive: true, class: { isArchived: false } },
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
      where: { teacherId, isActive: true, class: { isArchived: false } },
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
    const gradebook = await prisma.teacherSubject.findFirst({
      where: { id: Number(id), teacherId: (req as any).user.id, isActive: true, class: { isArchived: false } },
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

    const hasPublishedGrades = termId
      ? Boolean(await prisma.grade.findFirst({
          where: {
            subjectId: gradebook.subjectId,
            termId,
            student: { classId: gradebook.classId },
          },
          select: { id: true },
        }))
      : false;

    const assignments = ((gradebook.assignments || []) as any[]).map((assignment) => ({
      ...assignment,
      scoreCount: assignment.scores.length,
      deletionStatus: hasPublishedGrades
        ? "PUBLISHED"
        : assignment.scores.length > 0
          ? "SCORED"
          : "EMPTY",
    }));

    return res.json({
      ...gradebook,
      assignments,
    });

  } catch (err) {
    console.error("GET GRADEBOOK ERROR:", err);
    res.status(500).json({ message: "Error fetching gradebook" });
  }
};

export const getClassStudents = async (req: Request, res: Response) => {
  const { classId } = req.params;

  try {
    const permitted = await prisma.teacherSubject.findFirst({
      where: { classId: Number(classId), teacherId: (req as any).user.id, isActive: true, class: { isArchived: false } },
      select: { id: true },
    });
    if (!permitted) {
      return res.status(403).json({ message: "Not assigned to this class" });
    }

    const students = await prisma.student.findMany({
      where: { classId: Number(classId), isArchived: false },
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
      include: { teacherSubject: { select: { teacherId: true, classId: true, isActive: true } } },
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

    if (assignment.teacherSubject.teacherId !== (req as any).user.id) {
      return res.status(403).json({ message: "Not authorized for this assignment" });
    }
    if (!assignment.teacherSubject.isActive) {
      return res.status(403).json({ message: "This teacher assignment is inactive" });
    }

    const student = await prisma.student.findFirst({
      where: {
        id: Number(studentId),
        classId: assignment.teacherSubject.classId,
        isArchived: false,
      },
      select: { id: true },
    });
    if (!student) {
      return res.status(400).json({ message: "Student is not active in this assignment's class" });
    }

    if (scoreNumber > assignment.maxPoints) {
      return res.status(400).json({ message: "Score exceeds assignment maximum" });
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
    const numericTermId = Number(termId);
    const teacherSubject = await prisma.teacherSubject.findFirst({
      where: { id: tsId, teacherId: (req as any).user.id, isActive: true, class: { isArchived: false } },
      select: { classId: true, subjectId: true },
    });
    if (!teacherSubject) {
      return res.status(403).json({ message: "Not authorized for this class and subject" });
    }

    const term = await prisma.term.findFirst({
      where: { id: numericTermId, classId: teacherSubject.classId },
      select: { id: true },
    });
    if (!term) {
      return res.status(400).json({ message: "Term does not belong to the assigned class" });
    }

    const publishedGrade = await prisma.grade.findFirst({
      where: {
        subjectId: teacherSubject.subjectId,
        termId: numericTermId,
        student: { classId: teacherSubject.classId },
      },
      select: { id: true },
    });
    if (publishedGrade) {
      return res.status(409).json({
        message: "Final grades are already published for this subject and term",
      });
    }

    const last = await prisma.assignment.findFirst({
      where: {
        teacherSubjectId: tsId,
        termId: numericTermId,
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
  const assignmentId = Number(req.params.id);
  if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
    return res.status(400).json({ message: "Valid assignment ID required" });
  }
  try {
    const result = await deleteOwnedAssignment(
      prisma,
      (req as any).user.id,
      assignmentId,
      req.body?.confirmation,
    );
    if (result.status === "NOT_FOUND") return res.status(404).json({ message: "Assignment not found" });
    if (result.status === "TERM_MISMATCH") return res.status(409).json({ message: "Assignment Term does not belong to its class" });
    if (result.status === "PUBLISHED") {
      return res.status(409).json({
        message: "This assignment is part of published final grades and cannot be deleted.",
        deletionStatus: "PUBLISHED",
        scoreCount: result.scoreCount,
      });
    }
    if (result.status === "CONFIRMATION_REQUIRED") {
      return res.status(409).json({
        message: "This assignment contains scores. Explicit destructive confirmation is required.",
        deletionStatus: "SCORED",
        scoreCount: result.scoreCount,
        requiredConfirmation: "DELETE ASSIGNMENT",
      });
    }
    return res.json({ message: "Assignment and associated scores deleted", scoreCount: result.scoreCount });
  } catch (err) {
    console.error("DELETE ASSIGNMENT ERROR:", err);
    res.status(500).json({ message: "Error deleting assignment" });
  }
};

export const updateAssignment = async (req: Request, res: Response) => {
  try {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: Number(req.params.id),
        teacherSubject: { teacherId: (req as any).user.id, isActive: true },
      },
      select: {
        id: true,
        isLocked: true,
        termId: true,
        teacherSubject: { select: { subjectId: true, classId: true } },
      },
    });
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    const publishedGrade = await prisma.grade.findFirst({
      where: {
        subjectId: assignment.teacherSubject.subjectId,
        termId: assignment.termId,
        student: { classId: assignment.teacherSubject.classId },
      },
      select: { id: true },
    });
    if (publishedGrade) {
      return res.status(409).json({ message: "Published final-grade assignments cannot be edited" });
    }
    if (assignment.isLocked) return res.status(409).json({ message: "Assignment is locked" });

    const updated = await prisma.assignment.update({
      where: { id: assignment.id },
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

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: "No assignments provided" });
    }

    const ids = [...new Set(assignments.map((a: any) => Number(a.id)))];
    if (ids.some((id) => !Number.isInteger(id))) {
      return res.status(400).json({ error: "Invalid assignment id" });
    }

    const ownedCount = await prisma.assignment.count({
      where: {
        id: { in: ids },
        teacherSubject: { teacherId: (req as any).user.id, isActive: true },
      },
    });
    if (ownedCount !== ids.length) {
      return res.status(403).json({ error: "Cannot reorder another teacher's assignments" });
    }

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
      ...new Set(uniqueUpdates.map((u: any) => Number(u.assignmentId))),
    ];

    const assignments = await prisma.assignment.findMany({
      where: {
        id: { in: assignmentIds },
        teacherSubject: { teacherId: (req as any).user.id, isActive: true },
      },
      select: {
        id: true,
        isLocked: true,
        maxPoints: true,
        teacherSubject: { select: { classId: true } },
      },
    });

    const studentIds = [
      ...new Set(uniqueUpdates.map((u: any) => Number(u.studentId))),
    ];
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, isArchived: false },
      select: { id: true, classId: true },
    });
    const studentMap = new Map(students.map((student) => [student.id, student]));

    const assignmentMap = new Map(
      assignments.map((a) => [a.id, a])
    );

    let updated = 0;
    let skippedLocked = 0;
    let invalid = 0;

    const preview: any[] = [];
    const validUpdates: any[] = [];

    uniqueUpdates.forEach((u: any) => {
      const assignment = assignmentMap.get(Number(u.assignmentId));
      const student = studentMap.get(Number(u.studentId));
      const score = Number(u.score);

      let status = "valid";

      if (!assignment) {
        status = "invalid-assignment";
        invalid++;
      } else if (assignment.isLocked) {
        status = "locked";
        skippedLocked++;
      } else if (!student || student.classId !== assignment.teacherSubject.classId) {
        status = "invalid-student";
        invalid++;
      } else if (!isValidScore(score) || score > assignment.maxPoints) {
        status = "invalid-score";
        invalid++;
      } else {
        validUpdates.push({
          studentId: Number(u.studentId),
          assignmentId: Number(u.assignmentId),
          score,
          maxPoints: assignment.maxPoints,
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
          update: { score: u.score, maxPoints: u.maxPoints },
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

    const [assigned, term] = await Promise.all([
      prisma.teacherSubject.findFirst({
        where: { classId, teacherId, isActive: true, class: { isArchived: false } },
        select: { id: true },
      }),
      prisma.term.findFirst({
        where: { id: termId, classId },
      }),
    ]);

    if (!assigned) {
      return res.status(403).json({ error: "Not assigned to this class" });
    }

    if (!term) {
      return res.status(404).json({ error: "Term not found for this class" });
    }

    const [students, classSubjects] = await Promise.all([
      prisma.student.findMany({
        where: { classId, isArchived: false },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
      prisma.classSubject.findMany({
        where: { classId },
        orderBy: { subject: { name: "asc" } },
        include: {
          subject: {
            select: {
              name: true,
              teacherSubjects: {
                where: { classId },
                select: {
                  id: true,
                  teacherId: true,
                  isActive: true,
                  assignments: {
                    where: { termId },
                    select: {
                      id: true,
                      weight: true,
                      maxPoints: true,
                      scores: { select: { studentId: true, score: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const teacherSubjectIds = classSubjects.flatMap((entry) =>
      entry.subject.teacherSubjects.map((teacherSubject) => teacherSubject.id),
    );
    const studentIds = students.map((student) => student.id);
    const subjectIds = classSubjects.map((entry) => entry.subjectId);
    const [grades, comments, attendanceEntries] = await Promise.all([
      prisma.grade.findMany({
        where: { termId, studentId: { in: studentIds }, subjectId: { in: subjectIds } },
        select: { studentId: true, subjectId: true, total: true },
      }),
      prisma.reportComment.findMany({
      where: {
        studentId: { in: studentIds },
        teacherSubjectId: { in: teacherSubjectIds },
        termId,
      },
      select: { studentId: true, teacherSubjectId: true, comment: true },
      }),
      prisma.attendanceEntry.findMany({
        where: { studentId: { in: studentIds }, session: { termId } },
        include: { session: true },
      }),
    ]);
    const commentsByStudentAndSubject = indexReportComments(comments);

    /**
     * BUILD REPORTS
     */
    const result = students.map((student) => {
        const subjectResults = assembleClassSubjectResults({
          studentId: student.id,
          requestingTeacherId: teacherId,
          classSubjects,
          grades,
          comments: commentsByStudentAndSubject,
        }).map((subject) => {
          const letter = getLetterGrade(subject.finalGrade);
          return {
            ...subject,
            letter,
            gradeDescription: getGradeDescription(letter),
            status: subject.finalGrade === null ? "incomplete" : "complete",
          };
        });

        const studentAttendance = attendanceEntries.filter(
          (entry) => entry.studentId === student.id,
        );
        const dailyAttendance = summarizeAttendanceDays(studentAttendance.map((entry) => ({
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
          admissionNo: student.admissionNo,
          subjects: subjectResults,

          present,
          absent,
          late,
          attendanceRate,
        };
      });

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
    const { studentId, teacherSubjectId, termId, comment } = req.body;

    if (!studentId || !teacherSubjectId || !termId) {
      return res.status(400).json({ error: "studentId, teacherSubjectId, and termId are required" });
    }

    const teacherSubject = await prisma.teacherSubject.findFirst({
      where: {
        id: Number(teacherSubjectId),
        teacherId: (req as any).user.id,
        isActive: true,
      },
      select: { classId: true },
    });
    if (!teacherSubject) {
      return res.status(403).json({ error: "Not authorized for this subject" });
    }

    const [student, term] = await Promise.all([
      prisma.student.findFirst({
        where: { id: Number(studentId), classId: teacherSubject.classId, isArchived: false },
        select: { id: true },
      }),
      prisma.term.findFirst({
        where: { id: Number(termId), classId: teacherSubject.classId },
        select: { id: true },
      }),
    ]);
    if (!student || !term) {
      return res.status(400).json({ error: "Student or term does not belong to this class" });
    }

    const saved = await prisma.reportComment.upsert({
      where: {
        studentId_teacherSubjectId_termId: {
          studentId: Number(studentId),
          teacherSubjectId: Number(teacherSubjectId),
          termId: Number(termId),
        },
      },
      update: { comment },
      create: {
        studentId: Number(studentId),
        teacherSubjectId: Number(teacherSubjectId),
        termId: Number(termId),
        comment,
      },
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

export const publishFinalGrades = async (req: Request, res: Response) => {
  try {
    const classId = Number(req.params.classId);
    const termId = Number(req.body.termId);
    const teacherId = (req as any).user.id;

    if (!classId || !termId) {
      return res.status(400).json({ error: "classId and termId are required" });
    }

    const [term, students, teacherSubjects] = await Promise.all([
      prisma.term.findFirst({ where: { id: termId, classId }, select: { id: true } }),
      prisma.student.findMany({
        where: { classId, isArchived: false },
        select: { id: true, firstName: true, lastName: true },
      }),
      prisma.teacherSubject.findMany({
        where: { teacherId, classId, isActive: true, class: { isArchived: false } },
        include: {
          subject: { select: { id: true, name: true } },
          assignments: { where: { termId }, include: { scores: true } },
        },
      }),
    ]);

    if (teacherSubjects.length === 0) {
      return res.status(403).json({ error: "Not assigned to this class" });
    }
    if (!term) {
      return res.status(400).json({ error: "Term does not belong to this class" });
    }
    if (students.length === 0) {
      return res.status(400).json({ error: "No active students are assigned to this class" });
    }

    const missing: Array<{
      studentId?: number;
      student?: string;
      subject: string;
      assignment?: string;
    }> = [];

    for (const teacherSubject of teacherSubjects) {
      if (teacherSubject.assignments.length === 0) {
        missing.push({ subject: teacherSubject.subject.name });
        continue;
      }

      if (teacherSubject.assignments.some((assignment) => assignment.maxPoints <= 0)) {
        return res.status(409).json({
          error: `Cannot publish ${teacherSubject.subject.name}: assignment max points must be greater than zero.`,
        });
      }

      const totalWeight = teacherSubject.assignments.reduce(
        (sum, assignment) => sum + (assignment.weight ?? 1),
        0
      );
      if (totalWeight <= 0) {
        return res.status(409).json({
          error: `Cannot publish ${teacherSubject.subject.name}: total assignment weight must be greater than zero.`,
        });
      }

      for (const student of students) {
        for (const assignment of teacherSubject.assignments) {
          if (!assignment.scores.some((score) => score.studentId === student.id)) {
            missing.push({
              studentId: student.id,
              student: `${student.firstName} ${student.lastName}`,
              subject: teacherSubject.subject.name,
              assignment: assignment.title,
            });
          }
        }
      }
    }

    if (missing.length > 0) {
      return res.status(409).json({
        error: "Final grades cannot be published until every active student has a score for every assignment.",
        missing,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      let publishedGrades = 0;

      for (const teacherSubject of teacherSubjects) {
        for (const student of students) {
          const calculated = calculateFinalGradeForStudent(student.id, teacherSubject.assignments);
          if (calculated === null) throw new Error("Publication completeness guard failed");
          const total = Number(calculated.toFixed(1));

          await tx.grade.upsert({
            where: {
              studentId_subjectId_termId: {
                studentId: student.id,
                subjectId: teacherSubject.subjectId,
                termId,
              },
            },
            update: { average: total / 100, total },
            create: {
              studentId: student.id,
              subjectId: teacherSubject.subjectId,
              termId,
              average: total / 100,
              total,
            },
          });
          publishedGrades++;
        }

        await tx.assignment.updateMany({
          where: { id: { in: teacherSubject.assignments.map((assignment) => assignment.id) } },
          data: { isLocked: true },
        });
      }

      return { publishedGrades };
    });

    return res.json({
      success: true,
      ...result,
      message: "Final grades published and contributing assignments locked.",
    });
  } catch (err) {
    console.error("PUBLISH FINAL GRADES ERROR:", err);
    return res.status(500).json({ error: "Failed to publish final grades" });
  }
};

export const generateTranscripts = async (req: Request, res: Response) => {
  try {
    const classId = Number(req.body.classId);
    const termId = Number(req.body.termId);
    const teacherId = (req as any).user.id;

    if (!classId || !termId) {
      return res.status(400).json({ error: "classId and termId are required" });
    }

    const [assigned, term, students, classSubjects] = await Promise.all([
      prisma.teacherSubject.findFirst({
        where: { teacherId, classId, isActive: true, class: { isArchived: false } },
        select: { id: true },
      }),
      prisma.term.findFirst({
        where: { id: termId, classId },
        select: { id: true },
      }),
      prisma.student.findMany({
        where: { classId, isArchived: false },
        select: { id: true },
      }),
      prisma.classSubject.findMany({
        where: { classId },
        include: { subject: { select: { id: true, name: true } } },
      }),
    ]);

    if (!assigned) {
      return res.status(403).json({ error: "Not assigned to this class" });
    }
    if (!term) {
      return res.status(400).json({ error: "Term does not belong to this class" });
    }
    if (students.length === 0) {
      return res.status(400).json({ error: "No active students are assigned to this class" });
    }
    if (classSubjects.length === 0) {
      return res.status(400).json({ error: "No subjects are configured for this class" });
    }

    const studentIds = students.map((student) => student.id);
    const subjectIds = classSubjects.map((entry) => entry.subjectId);
    const grades = await prisma.grade.findMany({
      where: {
        termId,
        studentId: { in: studentIds },
        subjectId: { in: subjectIds },
      },
    });
    const gradeMap = new Map(
      grades.map((grade) => [`${grade.studentId}-${grade.subjectId}`, grade])
    );
    const missing = students.flatMap((student) =>
      classSubjects
        .filter((entry) => !gradeMap.has(`${student.id}-${entry.subjectId}`))
        .map((entry) => ({ studentId: student.id, subject: entry.subject.name }))
    );

    if (missing.length > 0) {
      return res.status(409).json({
        error: "All class subjects must have published final grades before transcripts can be generated.",
        missing,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      let generated = 0;
      let existing = 0;

      for (const student of students) {
        const prior = await tx.transcript.findUnique({
          where: { studentId_classId_termId: { studentId: student.id, classId, termId } },
          select: { id: true },
        });
        if (prior) {
          existing++;
          continue;
        }

        const studentGrades = classSubjects.map((entry) => ({
          subjectName: entry.subject.name,
          grade: gradeMap.get(`${student.id}-${entry.subjectId}`)!,
        }));

        await tx.transcript.create({
          data: {
            studentId: student.id,
            classId,
            termId,
            entries: {
              create: studentGrades.map(({ subjectName, grade }) => ({
                subjectName,
                finalGrade: Number(grade.total.toFixed(1)),
                letterGrade: getLetterGrade(grade.total) ?? "F",
              })),
            },
          },
        });
        generated++;
      }

      return { generated, existing };
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error("TRANSCRIPT ERROR:", err);
    res.status(500).json({ message: "Failed to generate transcripts" });
  }
};
