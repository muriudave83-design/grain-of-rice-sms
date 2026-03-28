import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getAttendanceSession(req: Request, res: Response) {
  try {
    const sessionId = Number(req.params.id);

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        entries: true,
        class: true,
      },
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const students = await prisma.student.findMany({
      where: { classId: session.classId },
      orderBy: [
        { firstName: "asc" },
        { lastName: "asc" }
      ]
    });

    return res.json({
      session,
      students,
      entries: session.entries,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load attendance session",
    });
  }
}
