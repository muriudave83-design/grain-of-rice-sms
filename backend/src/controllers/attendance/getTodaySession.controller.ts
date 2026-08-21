import { Request, Response } from "express";
import prisma from "../../prisma";

export const getTodaySession = async (req: Request, res: Response) => {
  try {
    const classId = Number(req.params.classId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const session = await prisma.attendanceSession.findFirst({
      where: {
        classId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: { id: "desc" },
    });

    if (!session) {
      return res.status(404).json({ message: "No session today" });
    }

    return res.status(200).json(session);
  } catch (error) {
    console.error("Get today session error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
