import { Request, Response } from "express";
import prisma from "../prisma";

// 🔒 GLOBAL LOCK CHECK
const checkSystemLock = async (res: Response) => {
  const locked = await prisma.term.findFirst({
    where: { isLocked: true },
  });

  if (locked) {
    res.status(400).json({ message: "System locked" });
    return true;
  }

  return false;
};

export const getDiscipline = async (req: Request, res: Response) => {
  const termId = req.query.termId === undefined ? undefined : Number(req.query.termId);
  if (termId !== undefined && (!Number.isInteger(termId) || termId <= 0)) {
    return res.status(400).json({ message: "Valid termId required" });
  }

  const data = await prisma.discipline.findMany({
    where: termId === undefined ? {} : { termId },

    include: {
      student: { include: { class: { select: { id: true, name: true } } } },
      term: true,
      recordedBy: { select: { id: true, name: true, role: true } },
    },

    orderBy: { date: "desc" },
  });

  res.json(data);
};

export const addDiscipline = async (req: Request, res: Response) => {
  const { studentId, type, note, termId } = req.body;

  // 🔒 LOCK CHECK
  if (await checkSystemLock(res)) return;

  const parsedStudentId = Number(studentId);
  const parsedTermId = Number(termId);
  const normalizedType = typeof type === "string" ? type.trim() : "";
  if (!Number.isInteger(parsedStudentId) || parsedStudentId <= 0 || !normalizedType || !Number.isInteger(parsedTermId) || parsedTermId <= 0) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const student = await prisma.student.findUnique({
    where: { id: parsedStudentId },
    select: { id: true, classId: true },
  });
  if (!student) return res.status(404).json({ message: "Student not found" });
  if (student.classId === null) {
    return res.status(409).json({ message: "Student has no current class" });
  }
  const term = await prisma.term.findFirst({
    where: { id: parsedTermId, classId: student.classId },
    select: { id: true },
  });
  if (!term) return res.status(400).json({ message: "Term does not belong to the student's class" });

  const record = await prisma.discipline.create({
    data: {
      studentId: student.id,
      type: normalizedType,
      notes: note || "",
      termId: term.id,
      recordedById: req.user!.id,
    },
    include: {
      student: { include: { class: { select: { id: true, name: true } } } },
      term: true,
      recordedBy: { select: { id: true, name: true, role: true } },
    },
  });

  res.json(record);
};

// ✅ UPDATE DISCIPLINE
export const updateDiscipline = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { type, note } = req.body;

  // 🔒 LOCK CHECK
  if (await checkSystemLock(res)) return;

  const record = await prisma.discipline.update({
    where: { id },
    data: {
      type,
      notes: note || "",
    },
  });

  res.json(record);
};

// 🔥 DELETE DISCIPLINE
export const deleteDiscipline = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  // 🔒 LOCK CHECK
  if (await checkSystemLock(res)) return;

  try {
    await prisma.discipline.delete({
      where: { id },
    });

    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete record" });
  }
};
