import { Request, Response } from "express";
import prisma from "../prisma";

export const getStudentsByClass = async (req: Request, res: Response) => {
  try {
    const classId = Number(req.params.id);

    const students = await prisma.student.findMany({
      where: {
        classId: classId,
      },
      select: {
        id: true,
        name: true,
        admissionNumber: true,
      },
    });

    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch students" });
  }
};