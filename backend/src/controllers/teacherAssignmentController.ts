import { Request, Response } from "express";
import { prisma } from "../prisma/client";

export const getTeacherAssignments = async (req: Request, res: Response) => {
  try {
    const teacherId = req.user!.id;

    const assignments = await prisma.teacherSubject.findMany({
      where: {
        teacherId: teacherId,
        isActive: true,
        class: { isArchived: false },
      },
      include: {
        subject: true,
        class: true
      }
    });

    res.json(assignments);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to fetch teacher assignments"
    });
  }
};
