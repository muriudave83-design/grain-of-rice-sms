import { Request, Response } from "express";
import { prisma } from "../../prisma/client";
import { AttendanceSessionStatus } from "@prisma/client";

export async function markAttendance(req: Request, res: Response) {
  try {
    const studentIdNum = Number(req.body.studentId);
    const classIdNum = Number(req.body.classId);
    const status = req.body.status;

    if (isNaN(studentIdNum) || isNaN(classIdNum) || !status) {
      return res.status(400).json({
        message: "Missing or invalid fields",
      });
    }

    // ✅ START OF DAY
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ✅ END OF DAY
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ✅ FIND TODAY SESSION PROPERLY
    let session = await prisma.attendanceSession.findFirst({
      where: {
        classId: classIdNum,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // ✅ CREATE ONLY IF NONE EXISTS
    if (!session) {
      session = await prisma.attendanceSession.create({
        data: {
          classId: classIdNum,
          teacherId: 1,
          date: new Date(),
          status: AttendanceSessionStatus.DRAFT,
        },
      });
    }

    // ✅ UPSERT ENTRY
    const record = await prisma.attendanceEntry.upsert({
      where: {
        attendanceSessionId_studentId: {
          attendanceSessionId: session.id,
          studentId: studentIdNum,
        },
      },
      update: {
        status,
      },
      create: {
        studentId: studentIdNum,
        attendanceSessionId: session.id,
        status,
      },
    });

    return res.json(record);

  } catch (error) {
    console.error("Mark attendance error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}