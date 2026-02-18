// backend/src/controllers/gradebookController.ts
import { Request, Response } from "express";
import { PrismaClient, Role } from "@prisma/client";
import { computeFinalForStudent, computeFinalForStudentsBulk } from "../utils/gradeHelpers";

const prisma = new PrismaClient();

/**
 * Teacher gradebook for a subject:
 * - returns students enrolled in subject
 * - their scores broken down per assessment
 * - computed finalScore
 * - missing count
 * Query params (optional): sortBy=name|finalScore|missing, order=asc|desc, filterMissing=true|false
 */
export const getTeacherGradebook = async (req: Request, res: Response) => {
  try {
    const teacher = (req as any).user;
    const subjectId = Number(req.params.subjectId);

    // verify teacher actually owns the subject (double-check RBAC)
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) return res.status(404).json({ error: "Subject not found" });
    if (subject.teacherId !== teacher.id && teacher.role !== Role.ADMIN) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // get enrolled students
    const enrollments = await prisma.enrollment.findMany({
      where: { subjectId },
      include: { student: true },
    });

    const studentIds = enrollments.map(e => e.studentId);
    const studentMap = new Map<number, any>();
    enrollments.forEach(e => {
      studentMap.set(e.studentId, {
        studentId: e.student.id,
        firstName: e.student.firstName,
        lastName: e.student.lastName,
        admissionNo: e.student.admissionNo,
      });
    });

    // compute finals in bulk
    const finals = await computeFinalForStudentsBulk(studentIds, subjectId);

    // assemble rows
    const rows = studentIds.map(id => {
      const base = studentMap.get(id);
      const data = finals[id] || { finalScore: 0, details: [], missingCount: 0, assessmentCount: 0 };
      return {
        ...base,
        finalScore: Number((data.finalScore * 100).toFixed(2)), // convert to percent if you prefer
        missingCount: data.missingCount,
        assessmentCount: data.assessmentCount,
        details: data.details,
      };
    });

    // simple sorting/filtering
    const { sortBy = "lastName", order = "asc", filterMissing } = req.query;

    let resultRows = rows;
    if (filterMissing === "true") {
      resultRows = resultRows.filter(r => r.missingCount > 0);
    }

    if (sortBy === "finalScore") {
      resultRows.sort((a, b) => order === "asc" ? a.finalScore - b.finalScore : b.finalScore - a.finalScore);
    } else if (sortBy === "missing") {
      resultRows.sort((a, b) => order === "asc" ? a.missingCount - b.missingCount : b.missingCount - a.missingCount);
    } else {
      // name
      resultRows.sort((a, b) => {
        const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
        const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
        return order === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
    }

    res.json({ subject: { id: subject.id, name: subject.name }, students: resultRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch gradebook" });
  }
};

/**
 * Parent view: single student gradebook across subjects (or by subject)
 * - returns subject list with finalScore and assessment details
 */
export const getParentGradebook = async (req: Request, res: Response) => {
  try {
    const parent = (req as any).user;
    const studentId = Number(req.params.studentId);

    // verify parent is guardian (unless admin)
    if (parent.role !== Role.ADMIN) {
      const guard = await prisma.guardian.findFirst({
        where: { studentId, userId: parent.id },
      });
      if (!guard) return res.status(403).json({ error: "Forbidden" });
    }

    // get subjects student is enrolled in
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: { subject: true },
    });

    const results: any[] = [];

    for (const e of enrollments) {
      const { finalScore, details } = await computeFinalForStudent(studentId, e.subjectId);
      results.push({
        subjectId: e.subjectId,
        subjectName: e.subject.name,
        finalScore: Number((finalScore * 100).toFixed(2)),
        assessmentCount: details.length,
        details, // details includes missing flags per assessment
      });
    }

    res.json({ studentId, subjects: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch parent gradebook" });
  }
};

/**
 * Admin overview: fetch subjects (optional filter by class) and compute top-level summary
 */
export const getAdminOverview = async (req: Request, res: Response) => {
  try {
    // very flexible: optional subjectId or className
    const { subjectId, className } = req.query;

    const where: any = {};
    if (subjectId) where.id = Number(subjectId);

    const subjects = await prisma.subject.findMany({ where });

    const overview: any[] = [];

    for (const s of subjects) {
      // students in subject
      const enrollments = await prisma.enrollment.findMany({ where: { subjectId: s.id }, include: { student: true }});
      const studentIds = enrollments.map(e => e.studentId);
      const finals = await computeFinalForStudentsBulk(studentIds, s.id);

      const studentsSummary = studentIds.map(id => ({
        studentId: id,
        name: enrollments.find(e => e.studentId === id)!.student.firstName + " " + enrollments.find(e => e.studentId === id)!.student.lastName,
        finalScore: Number((finals[id].finalScore * 100).toFixed(2)),
        missingCount: finals[id].missingCount,
      }));

      overview.push({
        subjectId: s.id,
        subjectName: s.name,
        teacherId: s.teacherId,
        studentCount: studentIds.length,
        students: studentsSummary,
      });
    }

    res.json({ overview });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch admin overview" });
  }
};
