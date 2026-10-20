import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import {
  compareAndSetReportComment,
  hasRequiredPrecondition,
  lockCommentWriteScope,
  SavePreconditionError,
  validateLockedCommentScope,
} from "../services/optimisticSave.service";
import { loadAuthoritativeReportResults, summarizeCompleteReport } from "../services/authoritativeReport.service";
import { loadReportAttendance } from "../services/attendance/reportAttendance.service";

export const saveReportComment = async (req: Request, res: Response) => {
  try {
    const { studentId, teacherSubjectId, termId, comment, expectedUpdatedAt } = req.body;
    if (!studentId || !teacherSubjectId || !termId) return res.status(400).json({ message: "Missing fields" });
    if (!hasRequiredPrecondition(req.body, "expectedUpdatedAt")) {
      return res.status(428).json({ message: "expectedUpdatedAt precondition is required" });
    }
    const saved = await prisma.$transaction(async (tx) => {
      validateLockedCommentScope(
        await lockCommentWriteScope(tx, Number(teacherSubjectId), Number(termId), Number(studentId)),
        req.user!.id,
      );
      return compareAndSetReportComment(tx, {
        studentId: Number(studentId),
        teacherSubjectId: Number(teacherSubjectId),
        termId: Number(termId),
        comment: String(comment ?? ""),
        expectedUpdatedAt: expectedUpdatedAt === null ? null : String(expectedUpdatedAt),
      });
    });
    return res.json(saved);
  } catch (err) {
    if (err instanceof SavePreconditionError) {
      return res.status(err.status).json({ message: err.message, current: err.current });
    }
    console.error("Save comment error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getStudentReport = async (req: Request, res: Response) => {
  const studentId = Number(req.params.studentId);
  if (!Number.isInteger(studentId) || studentId <= 0) return res.status(400).json({ message: "Invalid studentId" });

  try {
    const student = await prisma.student.findUnique({ where: { id: studentId }, include: { class: true } });
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.classId === null || !student.class) return res.status(409).json({ message: "Student has no current class" });
    const classId = student.classId;
    const user = req.user!;

    if (user.role === "STUDENT" && student.userId !== user.id) return res.status(403).json({ message: "Not allowed to view this student" });
    if (user.role === "TEACHER") {
      const assigned = await prisma.teacherSubject.findFirst({
        where: { teacherId: user.id, classId, isActive: true },
        select: { id: true },
      });
      if (!assigned) return res.status(403).json({ message: "Not assigned to this class" });
    }
    if (user.role === "PARENT") {
      const linked = await prisma.parentStudent.findFirst({
        where: { studentId: student.id, parent: { userId: user.id } },
        select: { id: true },
      });
      if (!linked) return res.status(403).json({ message: "Not linked to this student" });
    }

    const terms = await prisma.term.findMany({
      where: { classId },
      orderBy: [{ academicYear: "desc" }, { startDate: "desc" }, { id: "desc" }],
      select: { id: true, name: true, academicYear: true, startDate: true, endDate: true, isLocked: true },
    });
    const termIdRaw = req.query.termId;
    const termId = typeof termIdRaw === "string" ? Number(termIdRaw) : null;
    const identity = {
      studentId: student.id,
      student: `${student.firstName} ${student.lastName}`.replace(/\s+/g, " ").trim(),
      class: student.class.name,
      terms,
    };

    if (termId === null) {
      return res.json({
        ...identity,
        selectedTermId: null,
        subjects: [],
        summary: { total: null, average: null, grade: null, gradeDescription: null, isComplete: false },
      });
    }
    if (!Number.isInteger(termId) || !terms.some((term) => term.id === termId)) {
      return res.status(400).json({ message: "termId must identify a term for the student's current class" });
    }

    const selectedTerm = terms.find((term) => term.id === termId)!;
    const [{ resultsByStudent }, attendanceByStudent] = await Promise.all([
      loadAuthoritativeReportResults(prisma, {
        classId,
        termId,
        studentIds: [student.id],
        requestingTeacherId: user.role === "TEACHER" ? user.id : undefined,
        includeComments: true,
      }),
      loadReportAttendance(prisma, {
        classId,
        termId,
        startDate: selectedTerm.startDate,
        endDate: selectedTerm.endDate,
        studentIds: [student.id],
      }),
    ]);
    const subjects = (resultsByStudent.get(student.id) ?? []).map((subject) => ({
      ...subject,
      subject: subject.subjectName,
      average: subject.finalGrade,
    }));

    return res.json({
      ...identity,
      selectedTermId: termId,
      subjects,
      summary: summarizeCompleteReport(subjects),
      attendance: attendanceByStudent.get(student.id),
    });
  } catch (err) {
    console.error("getStudentReport error:", err);
    return res.status(500).json({ message: "Error generating report" });
  }
};
