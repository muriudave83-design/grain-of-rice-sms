// backend/src/controllers/gradebookController.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  computeFinalForStudent,
  computeFinalForStudentsBulk,
} from "../utils/gradeHelpers";

const prisma = new PrismaClient();

/**
 * Teacher gradebook (NEVER FAIL VERSION)
 */
export const getTeacherGradebook = async (req: Request, res: Response) => {
  try {
    const teacher = (req as any).user;
    const subjectId = Number(req.params.subjectId);

    const teacherSubjects = await prisma.teacherSubject.findMany({
      where: { teacherId: teacher.id, subjectId, isActive: true, class: { isArchived: false } },
      include: { subject: true },
    });
    const subject = teacherSubjects[0]?.subject;

    if (!subject) {
      return res.status(200).json({
        message: "Subject not found",
        subject: null,
        students: [],
      });
    }

    // ✅ Safe enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: {
        subjectId,
        student: {
          classId: { in: teacherSubjects.map((item) => item.classId) },
          isArchived: false,
        },
      },
      include: { student: true },
    });

    if (!enrollments.length) {
      return res.status(200).json({
        message: "No students enrolled in this subject",
        subject: { id: subject.id, name: subject.name },
        students: [],
      });
    }

    const studentIds = enrollments.map((e) => e.studentId);

    const studentMap = new Map<number, any>();
    enrollments.forEach((e) => {
      studentMap.set(e.studentId, {
        studentId: e.student.id,
        firstName: e.student.firstName,
        lastName: e.student.lastName,
        admissionNo: e.student.admissionNo,
      });
    });

    // ✅ Safe compute (never crash)
    let finals: any = {};
    try {
      finals = await computeFinalForStudentsBulk(studentIds, subjectId);
    } catch (err) {
      console.error("⚠️ computeFinalForStudentsBulk failed:", err);
      finals = {};
    }

    const rows = studentIds.map((id) => {
      const base = studentMap.get(id);

      const data = finals?.[id] || {
        finalScore: 0,
        details: [],
        missingCount: 0,
        assessmentCount: 0,
      };

      return {
        ...base,
        finalScore: Number(((data.finalScore || 0) * 100).toFixed(2)),
        missingCount: data.missingCount || 0,
        assessmentCount: data.assessmentCount || 0,
        details: data.details || [],
      };
    });

    // ✅ Safe sorting
    const { sortBy = "lastName", order = "asc", filterMissing } = req.query;

    let resultRows = rows;

    if (filterMissing === "true") {
      resultRows = resultRows.filter((r) => r.missingCount > 0);
    }

    if (sortBy === "finalScore") {
      resultRows.sort((a, b) =>
        order === "asc"
          ? a.finalScore - b.finalScore
          : b.finalScore - a.finalScore
      );
    } else if (sortBy === "missing") {
      resultRows.sort((a, b) =>
        order === "asc"
          ? a.missingCount - b.missingCount
          : b.missingCount - a.missingCount
      );
    } else {
      resultRows.sort((a, b) => {
        const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
        const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
        return order === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      });
    }

    return res.status(200).json({
      message: "Gradebook loaded",
      subject: { id: subject.id, name: subject.name },
      students: resultRows,
    });
  } catch (err) {
    console.error("🔥 Gradebook fatal error:", err);

    return res.status(200).json({
      message: "Could not load gradebook",
      subject: null,
      students: [],
    });
  }
};

/**
 * Parent view (SAFE)
 */
export const getParentGradebook = async (req: Request, res: Response) => {
  try {
    const parent = (req as any).user;
    const studentId = Number(req.params.studentId);

    // ✅ Always enforce guardian relationship (no admin bypass here)
    const guard = await prisma.guardian.findFirst({
      where: { studentId, userId: parent.id },
    });

    if (!guard) {
      return res.status(200).json({
        message: "You are not authorized to view this student",
        studentId,
        subjects: [],
      });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: { subject: true },
    });

    if (!enrollments.length) {
      return res.status(200).json({
        message: "Student is not enrolled in any subjects",
        studentId,
        subjects: [],
      });
    }

    const results: any[] = [];

    for (const e of enrollments) {
      try {
        const { finalScore, details } = await computeFinalForStudent(
          studentId,
          e.subjectId
        );

        results.push({
          subjectId: e.subjectId,
          subjectName: e.subject.name,
          finalScore: Number((finalScore * 100).toFixed(2)),
          assessmentCount: details.length,
          details,
        });
      } catch (err) {
        console.error("⚠️ computeFinalForStudent failed:", err);

        results.push({
          subjectId: e.subjectId,
          subjectName: e.subject.name,
          finalScore: 0,
          assessmentCount: 0,
          details: [],
        });
      }
    }

    return res.status(200).json({
      message: "Parent gradebook loaded",
      studentId,
      subjects: results,
    });
  } catch (err) {
    console.error("🔥 Parent gradebook error:", err);

    return res.status(200).json({
      message: "Could not load parent gradebook",
      studentId: null,
      subjects: [],
    });
  }
};

/**
 * Admin overview (SAFE)
 */
export const getAdminOverview = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.query;

    const where: any = {};
    if (subjectId) where.id = Number(subjectId);

    const subjects = await prisma.subject.findMany({ where });

    if (!subjects.length) {
      return res.status(200).json({
        message: "No subjects found",
        overview: [],
      });
    }

    const overview: any[] = [];

    for (const s of subjects) {
      try {
        const enrollments = await prisma.enrollment.findMany({
          where: { subjectId: s.id },
          include: { student: true },
        });

        const studentIds = enrollments.map((e) => e.studentId);

        let finals: any = {};
        try {
          finals = await computeFinalForStudentsBulk(studentIds, s.id);
        } catch (err) {
          console.error("⚠️ bulk compute failed:", err);
          finals = {};
        }

        const studentsSummary = studentIds.map((id) => {
          const student = enrollments.find((e) => e.studentId === id)?.student;

          return {
            studentId: id,
            name: student
              ? `${student.firstName} ${student.lastName}`
              : "Unknown",
            finalScore: Number(
              ((finals?.[id]?.finalScore || 0) * 100).toFixed(2)
            ),
            missingCount: finals?.[id]?.missingCount || 0,
          };
        });

        overview.push({
          subjectId: s.id,
          subjectName: s.name,
          teacherId: s.teacherId,
          studentCount: studentIds.length,
          students: studentsSummary,
        });
      } catch (err) {
        console.error("⚠️ subject processing failed:", err);
      }
    }

    return res.status(200).json({
      message: "Admin overview loaded",
      overview,
    });
  } catch (err) {
    console.error("🔥 Admin overview error:", err);

    return res.status(200).json({
      message: "Could not load admin overview",
      overview: [],
    });
  }
};
