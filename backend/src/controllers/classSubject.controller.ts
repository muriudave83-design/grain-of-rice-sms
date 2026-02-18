import { Request, Response } from "express";
import { prisma } from "../prisma/client";

/**
 * GET /api/admin/class-subjects
 * List all class-subject assignments
 */
export const listClassSubjects = async (_req: Request, res: Response) => {
  try {
    const data = await prisma.classSubject.findMany({
      include: {
        class: true,
        subject: true,
      },
      orderBy: { id: "asc" },
    });

    res.json(data);
  } catch (err) {
    console.error("Failed to list class-subjects:", err);
    res.status(500).json({ message: "Failed to fetch assignments" });
  }
};

/**
 * POST /api/admin/class-subjects
 * Assign subject to class
 */
export const createClassSubject = async (req: Request, res: Response) => {
  try {
    const { classId, subjectId } = req.body;

    if (!classId || !subjectId) {
      return res.status(400).json({ message: "Missing classId or subjectId" });
    }

    // Prevent duplicates
    const existing = await prisma.classSubject.findFirst({
      where: { classId, subjectId },
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "Subject already assigned to this class" });
    }

    const record = await prisma.classSubject.create({
      data: { classId, subjectId },
      include: {
        class: true,
        subject: true,
      },
    });

    res.status(201).json(record);
  } catch (err) {
    console.error("Failed to assign subject to class:", err);
    res.status(500).json({ message: "Failed to assign subject" });
  }
};
