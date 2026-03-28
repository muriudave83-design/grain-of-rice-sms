import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function saveAttendanceRecords(req: Request, res: Response) {
  try {
    const sessionId = Number(req.params.id);
    const { records } = req.body;

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.status !== "DRAFT") {
      return res.status(409).json({
        message: "Attendance session already submitted",
      });
    }

    for (const record of records) {
      await prisma.attendanceEntry.upsert({
        where: {
          attendanceSessionId_studentId: {
            attendanceSessionId: sessionId,
            studentId: record.studentId,
          },
        },
        update: {
          status: record.status,
        },
        create: {
          attendanceSessionId: sessionId,
          studentId: record.studentId,
          status: record.status,
        },
      });
    }

    return res.json({ message: "Attendance saved" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to save attendance",
    });
  }
}
