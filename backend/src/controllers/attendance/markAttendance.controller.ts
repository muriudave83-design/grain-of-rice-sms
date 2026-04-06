import { Request, Response } from "express";
import { prisma } from "../../prisma/client";
import { AttendanceSessionStatus } from "@prisma/client";

export async function markAttendance(req: Request, res: Response) {
  try {
    // ✅ Convert to numbers (FIX)
    const studentIdNum = Number(req.body.studentId);
    const classIdNum = Number(req.body.classId);
    const status = req.body.status;

    // ✅ Validate
    if (isNaN(studentIdNum) || isNaN(classIdNum) || !status) {
      return res.status(400).json({ message: "Missing or invalid fields" });
    }

    let session = await prisma.attendanceSession.findFirst({
      where: {
        classId: classIdNum, // ✅ FIXED
        date: new Date(),
      },
    });

    if (!session) {
      session = await prisma.attendanceSession.create({
        data: {
          classId: classIdNum, // ✅ FIXED
          teacherId: 1,
          date: new Date(),
          status: AttendanceSessionStatus.DRAFT,
        },
      });
    }

    const record = await prisma.attendanceEntry.upsert({
      where: {
        attendanceSessionId_studentId: {
          attendanceSessionId: session.id,
          studentId: studentIdNum, // ✅ FIXED
        },
      },
      update: {
        status,
      },
      create: {
        studentId: studentIdNum, // ✅ FIXED
        attendanceSessionId: session.id,
        status,
      },
    });

    return res.json(record);

  } catch (error) {
    console.error("Mark attendance error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}