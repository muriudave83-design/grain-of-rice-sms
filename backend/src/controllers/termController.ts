import { Request, Response } from "express";
import { prisma } from "../prisma/client";

// GET /api/admin/terms
export async function getTerms(req: Request, res: Response) {
  const terms = await prisma.term.findMany({
    orderBy: { startDate: "desc" },
  });

  res.json(terms);
}

// POST /api/admin/terms
export async function createTerm(req: Request, res: Response) {
  const { name, startDate, endDate, academicYear, classId } = req.body;

  if (!name || !startDate || !endDate || !academicYear) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const term = await prisma.term.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        academicYear,
        classId: Number(classId), // ✅ ADD THIS
      },
  });

  res.status(201).json(term);
}

export const toggleTermLock = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const term = await prisma.term.findUnique({
    where: { id },
  });

  const updated = await prisma.term.update({
    where: { id },
    data: {
      isLocked: !term?.isLocked,
    },
  });

  res.json(updated);
};