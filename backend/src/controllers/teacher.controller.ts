import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { getLetterGrade } from "../utils/gradeDescriptions";
import { AssessmentType } from "@prisma/client";
import { loadReportAttendance } from "../services/attendance/reportAttendance.service";
import { loadAuthoritativeReportResults } from "../services/authoritativeReport.service";
import { FinalGradePublicationError, publishFinalGradesAtomically } from "../services/finalGradePublication.service";
import { deleteOwnedAssignment } from "../services/assignmentDeletion.service";
import { assertNotCombinedChild, CombinedTeachingGroupError } from "../services/combinedTeachingGroup.service";
import { AssignmentMaximumPointsError, updateOwnedAssignmentMaximumPoints } from "../services/assignmentMaximumPoints.service";
import {
  compareAndSetScore,
  hasRequiredPrecondition,
  isTransientCommentSaveError,
  saveAuthorizedReportComment,
  lockScoreWriteScope,
  SavePreconditionError,
  validateLockedScoreScope,
} from "../services/optimisticSave.service";
import { accessibleTeacherSubjectIds, activeHandoverForAssignment, TeacherSubjectHandoverError } from "../services/teacherSubjectHandover.service";


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

    const scope = termId ? await accessibleTeacherSubjectIds(prisma, {
      replacementTeacherSubjectId: gradebook.id, teacherId: (req as any).user.id, termId,
    }) : null;
    const loadedAssignments: any[] = scope ? await prisma.assignment.findMany({
      where: { termId: Number(termId), teacherSubjectId: { in: scope.teacherSubjectIds }, combinedAssignmentChild: null },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      include: { scores: true, teacherSubject: { select: { id: true, teacherId: true } } },
    }) : [];
    const assignments = loadedAssignments.map((assignment) => ({
      ...assignment,
      accessSource: assignment.teacherSubjectId === gradebook.id ? "OWNER" : "HANDOVER",
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
    if (err instanceof TeacherSubjectHandoverError) return res.status(err.status).json({ message: err.message });
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
  const { studentId, assignmentId, score, expectedScore } = req.body;

  if (!hasRequiredPrecondition(req.body, "expectedScore")) {
    return res.status(428).json({ message: "expectedScore precondition is required" });
  }
  if (expectedScore !== null && !Number.isFinite(Number(expectedScore))) {
    return res.status(428).json({ message: "expectedScore must be null or a finite number" });
  }

  const scoreNumber = Number(score);
  if (!isValidScore(scoreNumber)) {
    return res.status(400).json({ message: "Invalid score" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
    const access = await activeHandoverForAssignment(tx, (req as any).user.id, Number(assignmentId));
    const locked = validateLockedScoreScope(
      await lockScoreWriteScope(tx, Number(assignmentId), Number(studentId)),
      { ...(access.access === "OWNER" ? { teacherId: (req as any).user.id } : {}), score: scoreNumber },
    );
    await assertNotCombinedChild(tx, [locked.assignmentId]);

    return compareAndSetScore(tx, {
      studentId: Number(studentId),
      assignmentId: Number(assignmentId),
      score: scoreNumber,
      maxPoints: locked.maxPoints,
      expectedScore: expectedScore === null ? null : Number(expectedScore),
    });
    });

    res.json(result);
  } catch (err) {
    if (err instanceof TeacherSubjectHandoverError) return res.status(err.status).json({ message: err.message });
    if (err instanceof SavePreconditionError) return res.status(err.status).json({ message: err.message, current: err.current });
    if (err instanceof CombinedTeachingGroupError) return res.status(err.status).json({ message: err.message });
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

    const assignment = await prisma.$transaction(async (tx) => {
      const created = await tx.assignment.create({ data: {
        title,
        teacherSubjectId: tsId,
        termId: Number(termId),
        gradeContributionStatus: "INCLUDED",

        type: normalizedType as AssessmentType,

        // 🔥 NEW STANDARDIZED FIELDS
        maxPoints: maxPoints ? parseFloat(maxPoints) : 100,
        dateAssigned: dateAssigned ? new Date(dateAssigned) : null,
        dueDate: dueDate ? new Date(dueDate) : null,

        // Existing fields (unchanged)
        position,
        ...(weight !== undefined && { weight }),
      }});
      const scopeKey = { classId: teacherSubject.classId, subjectId: teacherSubject.subjectId, termId: numericTermId };
      const ownerRows = await tx.assignment.findMany({
        where: { termId: numericTermId, teacherSubject: { classId: teacherSubject.classId, subjectId: teacherSubject.subjectId } },
        select: { teacherSubjectId: true },
      });
      const ownerCount = new Set(ownerRows.map((row) => row.teacherSubjectId)).size;
      const existingScope = await tx.gradeContributionScope.findUnique({ where: { classId_subjectId_termId: scopeKey } });
      if (existingScope) {
        await tx.gradeContributionScope.update({
          where: { id: existingScope.id },
          data: { revision: { increment: 1 } },
        });
      } else if (ownerCount > 1) {
        await tx.gradeContributionScope.create({ data: { ...scopeKey, mode: "REVIEWING" } });
      }
      return created;
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
    await assertNotCombinedChild(prisma, [assignmentId]);
    const deletionAccess = await activeHandoverForAssignment(prisma, (req as any).user.id, assignmentId);
    if (deletionAccess.access === "HANDOVER") {
      return res.status(403).json({ message: "Historical handover assignments cannot be deleted; an administrator must preserve their original record" });
    }
    const result = await deleteOwnedAssignment(
      prisma,
      (req as any).user.id,
      assignmentId,
      req.body?.confirmation,
    );
    if (result.status === "NOT_FOUND") return res.status(404).json({ message: "Assignment not found" });
    if (result.status === "TERM_MISMATCH") return res.status(409).json({ message: "Assignment Term does not belong to its class" });
    if (result.status === "PUBLISHED_CONFIRMATION_REQUIRED") {
      return res.status(409).json({
        message: "This assignment contributes to published final grades. Explicit published-data deletion confirmation is required.",
        deletionStatus: "PUBLISHED",
        scoreCount: result.scoreCount,
        publishedGradeCount: result.publishedGradeCount,
        assignmentName: result.title,
        requiredConfirmation: "DELETE PUBLISHED ASSIGNMENT",
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
    return res.json({
      message: result.invalidatedGradeCount > 0
        ? "Published assignment data deleted; affected final grades must be republished"
        : "Assignment and associated scores deleted",
      scoreCount: result.scoreCount,
      invalidatedGradeCount: result.invalidatedGradeCount,
    });
  } catch (err) {
    if (err instanceof TeacherSubjectHandoverError) return res.status(err.status).json({ message: err.message });
    if (err instanceof CombinedTeachingGroupError) return res.status(err.status).json({ message: err.message });
    console.error("DELETE ASSIGNMENT ERROR:", err);
    res.status(500).json({ message: "Error deleting assignment" });
  }
};

export const updateAssignment = async (req: Request, res: Response) => {
  if (Object.prototype.hasOwnProperty.call(req.body, "maxPoints")) {
    return res.status(400).json({ message: "Use the maximum-points endpoint to change maximum points" });
  }
  try {
    const assignment = await prisma.assignment.findFirst({
      where: { id: Number(req.params.id) },
      select: {
        id: true,
        isLocked: true,
        termId: true,
        term: { select: { isLocked: true, isActive: true } },
        teacherSubject: { select: { subjectId: true, classId: true } },
      },
    });
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    await activeHandoverForAssignment(prisma, (req as any).user.id, assignment.id);
    await assertNotCombinedChild(prisma, [assignment.id]);
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
    if (assignment.isLocked || assignment.term.isLocked || !assignment.term.isActive) return res.status(409).json({ message: "Assignment or term is locked or inactive" });

    const updated = await prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        ...(req.body.title !== undefined && { title: req.body.title }),
        ...(req.body.weight !== undefined && { weight: req.body.weight }),

        // 🔥 OPTIONAL: allow updating new fields too
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
    if (err instanceof TeacherSubjectHandoverError) return res.status(err.status).json({ message: err.message });
    if (err instanceof CombinedTeachingGroupError) return res.status(err.status).json({ message: err.message });
    console.error("UPDATE ASSIGNMENT ERROR:", err);
    res.status(500).json({ message: "Error updating assignment" });
  }
};

export const updateAssignmentMaximumPoints = async (req: Request, res: Response) => {
  if (!Object.prototype.hasOwnProperty.call(req.body, "expectedMaxPoints")) {
    return res.status(428).json({ message: "expectedMaxPoints precondition is required" });
  }
  try {
    const assignment = await updateOwnedAssignmentMaximumPoints(prisma, {
      assignmentId: Number(req.params.id),
      teacherId: (req as any).user.id,
      maxPoints: req.body.maxPoints,
      expectedMaxPoints: req.body.expectedMaxPoints,
    });
    return res.json(assignment);
  } catch (err) {
    if (err instanceof AssignmentMaximumPointsError) {
      return res.status(err.status).json({ message: err.message, ...(err.current ? { current: err.current } : {}) });
    }
    if ((err as any)?.code === "P2034") {
      return res.status(409).json({ message: "Assignment or scores changed concurrently; refresh and try again" });
    }
    console.error("UPDATE ASSIGNMENT MAXIMUM POINTS ERROR:", err);
    return res.status(500).json({ message: "Failed to update maximum points" });
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

    await Promise.all(ids.map((id) => activeHandoverForAssignment(prisma, (req as any).user.id, id)));
    await assertNotCombinedChild(prisma, ids);

    const mutableAssignments = await prisma.assignment.findMany({
      where: { id: { in: ids } },
      select: { id: true, isLocked: true, termId: true, term: { select: { isLocked: true, isActive: true } }, teacherSubject: { select: { classId: true, subjectId: true } } },
    });
    if (mutableAssignments.some((item) => item.isLocked || item.term.isLocked || !item.term.isActive)) {
      return res.status(409).json({ error: "Cannot reorder locked or inactive assignments" });
    }
    for (const item of mutableAssignments) {
      const published = await prisma.grade.findFirst({ where: {
        termId: item.termId, subjectId: item.teacherSubject.subjectId,
        student: { classId: item.teacherSubject.classId },
      }, select: { id: true } });
      if (published) return res.status(409).json({ error: "Published final-grade assignments cannot be reordered" });
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
    if (err instanceof TeacherSubjectHandoverError) return res.status(err.status).json({ message: err.message });
    if (err instanceof CombinedTeachingGroupError) return res.status(err.status).json({ message: err.message });
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
    if (uniqueUpdates.some((update: any) => !hasRequiredPrecondition(update, "expectedScore"))) {
      return res.status(428).json({ message: "Every score update requires expectedScore" });
    }
    if (uniqueUpdates.some((update: any) => update.expectedScore !== null && !Number.isFinite(Number(update.expectedScore)))) {
      return res.status(428).json({ message: "Every expectedScore must be null or a finite number" });
    }

    const assignmentIds = [
      ...new Set(uniqueUpdates.map((u: any) => Number(u.assignmentId))),
    ];

    const assignments = await prisma.assignment.findMany({
      where: {
        id: { in: assignmentIds },
      },
      select: {
        id: true,
        isLocked: true,
        term: { select: { isLocked: true, isActive: true } },
        maxPoints: true,
        teacherSubject: { select: { classId: true } },
      },
    });
    const accessByAssignment = new Map<number, any>();
    for (const assignmentId of assignmentIds) {
      try { accessByAssignment.set(assignmentId, await activeHandoverForAssignment(prisma, (req as any).user.id, assignmentId)); }
      catch (error) { if (!(error instanceof TeacherSubjectHandoverError)) throw error; }
    }
    await assertNotCombinedChild(prisma, assignmentIds);

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
    let conflicted = 0;

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
      } else if (!accessByAssignment.has(Number(u.assignmentId))) {
        status = "invalid-assignment";
        invalid++;
      } else if (assignment.isLocked || assignment.term?.isLocked || !assignment.term?.isActive) {
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
          expectedScore: u.expectedScore === null ? null : Number(u.expectedScore),
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

    for (const update of validUpdates) {
      try {
        await prisma.$transaction(async (tx) => {
          const access = await activeHandoverForAssignment(tx, (req as any).user.id, update.assignmentId);
          const locked = validateLockedScoreScope(
            await lockScoreWriteScope(tx, update.assignmentId, update.studentId),
            { ...(access.access === "OWNER" ? { teacherId: (req as any).user.id } : {}), score: update.score },
          );
          await assertNotCombinedChild(tx, [locked.assignmentId]);
          return compareAndSetScore(tx, { ...update, maxPoints: locked.maxPoints });
        });
        updated++;
      } catch (error) {
        const item = preview.find((entry) => Number(entry.studentId) === update.studentId && Number(entry.assignmentId) === update.assignmentId);
        if (error instanceof TeacherSubjectHandoverError) {
          invalid++;
          if (item) item.status = "invalid-assignment";
          continue;
        }
        if (!(error instanceof SavePreconditionError)) throw error;
        if (error.status === 409 && error.current !== undefined) {
          conflicted++;
          if (item) {
          item.status = "conflict";
          item.current = error.current;
          }
        } else if (/locked|inactive/i.test(error.message)) {
          skippedLocked++;
          if (item) item.status = "locked";
        } else {
          invalid++;
          if (item) item.status = "invalid";
        }
      }
    }

    res.json({
      success: true,
      mode: "commit",
      updated,
      skippedLocked,
      conflicted,
      invalid,
      totalReceived: updates.length,
      results: preview,
    });
  } catch (err) {
    if (err instanceof CombinedTeachingGroupError) return res.status(err.status).json({ message: err.message });
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

    const students = await prisma.student.findMany({
      where: { classId, isArchived: false },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
    const studentIds = students.map((student) => student.id);
    const [{ resultsByStudent }, attendanceByStudent] = await Promise.all([
      loadAuthoritativeReportResults(prisma, {
        classId,
        termId,
        studentIds,
        requestingTeacherId: teacherId,
        includeComments: true,
      }),
      loadReportAttendance(prisma, {
        classId,
        termId,
        startDate: term.startDate,
        endDate: term.endDate,
        studentIds,
      }),
    ]);

    /**
     * BUILD REPORTS
     */
    const result = students.map((student) => {
        const subjectResults = (resultsByStudent.get(student.id) ?? []).map((subject) => ({
          ...subject,
          letter: subject.grade,
          status: subject.finalGrade === null ? "incomplete" : "complete",
        }));

        const attendance = attendanceByStudent.get(student.id)!;
        const { present, absent, late, attendanceRate } = attendance;

        return {
          studentId: student.id,
          name: `${student.firstName} ${student.lastName}`,
          admissionNo: student.admissionNo,
          subjects: subjectResults,

          present,
          absent,
          late,
          attendanceRate,
          attendanceState: attendance.state,
          attendanceDraftDays: attendance.draftDays,
          attendanceIncompleteDays: attendance.incomplete,
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
    const { studentId, teacherSubjectId, termId, comment, expectedUpdatedAt, allowEmpty } = req.body;

    if (!studentId || !teacherSubjectId || !termId) {
      return res.status(400).json({ error: "studentId, teacherSubjectId, and termId are required" });
    }
    if (!hasRequiredPrecondition(req.body, "expectedUpdatedAt")) {
      return res.status(428).json({ error: "expectedUpdatedAt precondition is required" });
    }

    const saved = await saveAuthorizedReportComment(prisma, {
        teacherId: (req as any).user.id,
        studentId: Number(studentId),
        teacherSubjectId: Number(teacherSubjectId),
        termId: Number(termId),
        comment: String(comment ?? ""),
        expectedUpdatedAt: expectedUpdatedAt === null ? null : String(expectedUpdatedAt),
        allowEmpty: allowEmpty === true,
    });

    res.json(saved);
  } catch (err) {
    if (err instanceof SavePreconditionError) return res.status(err.status).json({ error: err.message, current: err.current });
    if (isTransientCommentSaveError(err)) return res.status(503).json({ error: "Comment save temporarily unavailable; your draft is safe. Retry shortly.", retryable: true });
    console.error("Comment save failed:", err);
    res.status(500).json({ error: "Failed to save comment" });
  }
};

//
// 🧾 TRANSCRIPTS — NOW TERM-AWARE ✅
//

export const publishFinalGrades = async (req: Request, res: Response) => {
  const classId = Number(req.params.classId);
  const termId = Number(req.body.termId);
  const teacherId = (req as any).user.id;
  if (!classId || !termId) return res.status(400).json({ error: "classId and termId are required" });

  try {
    const result = await publishFinalGradesAtomically(prisma, { classId, termId, teacherId });
    return res.json({
      success: true,
      ...result,
      message: "Final grades published and contributing assignments locked.",
    });
  } catch (err) {
    if (err instanceof FinalGradePublicationError) {
      return res.status(err.status).json({ error: err.message, ...(err.details as object ?? {}) });
    }
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
