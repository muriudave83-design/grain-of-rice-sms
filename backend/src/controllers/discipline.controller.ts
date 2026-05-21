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
  const termId = Number(req.query.termId);

  const data = await prisma.discipline.findMany({
    where: termId
      ? {
          termId,
        }
      : undefined,

    include: {
      student: true,
      term: true,
    },

    orderBy: { date: "desc" },
  });

  res.json(data);
};

export const addDiscipline = async (req: Request, res: Response) => {
  const { studentId, type, note, termId } = req.body;

  // 🔒 LOCK CHECK
  if (await checkSystemLock(res)) return;

  if (!studentId || !type) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const record = await prisma.discipline.create({
    data: {
      studentId: Number(studentId),
      type,
      notes: note || "",
      termId: termId ? Number(termId) : null,
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