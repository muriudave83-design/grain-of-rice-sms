import { Request, Response } from "express";
import prisma from "../prisma";
import {
  createTeacherDisciplineRecord,
  listTeacherDisciplineRecords,
  listTeacherDisciplineStudents,
  listTeacherTerms,
} from "../services/teacherDiscipline.service";

const positiveId = (value: unknown) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function getTeacherDisciplineStudents(req: Request, res: Response) {
  const students = await listTeacherDisciplineStudents(prisma, req.user!.id);
  return res.json(students);
}

export async function getTeacherDisciplineTerms(req: Request, res: Response) {
  const rawStudentId = req.query.studentId;
  const studentId = rawStudentId === undefined ? undefined : positiveId(rawStudentId);
  if (rawStudentId !== undefined && studentId === null) {
    return res.status(400).json({ message: "Valid studentId required" });
  }
  const terms = await listTeacherTerms(prisma, req.user!.id, studentId ?? undefined);
  if (terms === null) return res.status(403).json({ message: "Student access denied" });
  return res.json(terms);
}

export async function getTeacherDiscipline(req: Request, res: Response) {
  const records = await listTeacherDisciplineRecords(prisma, req.user!.id);
  return res.json(records);
}

export async function addTeacherDiscipline(req: Request, res: Response) {
  const studentId = positiveId(req.body.studentId);
  const termId = positiveId(req.body.termId);
  const type = typeof req.body.type === "string" ? req.body.type.trim() : "";
  const note = typeof req.body.note === "string" ? req.body.note : "";
  if (!studentId || !termId || !type) {
    return res.status(400).json({ message: "Student, Term, and incident/type are required" });
  }

  const result = await createTeacherDisciplineRecord(prisma, req.user!.id, {
    studentId, termId, type, note,
  });
  if ("error" in result) {
    if (result.error === "TERM_LOCKED") return res.status(409).json({ message: "Term is locked" });
    return res.status(403).json({
      message: result.error === "STUDENT_FORBIDDEN" ? "Student access denied" : "Term does not belong to the student's class",
    });
  }
  return res.status(201).json(result.record);
}
