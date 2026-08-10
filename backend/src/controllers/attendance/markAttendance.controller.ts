import { Request, Response } from "express";
import { prisma } from "../../prisma/client";
import { AttendancePeriod, AttendanceSessionStatus, AttendanceStatus } from "@prisma/client";
import { buildAfternoonCopies, parseClientAttendancePeriod } from "../../services/attendance/attendanceDomain";

export async function markAttendance(req: Request, res: Response) {
  try {
    const studentIdNum = Number(req.body.studentId);
    const classIdNum = Number(req.body.classId);
    const status = req.body.status;
    const period = parseClientAttendancePeriod(req.body.period);

    if (
      isNaN(studentIdNum) ||
      isNaN(classIdNum) ||
      !period ||
      !Object.values(AttendanceStatus).includes(status as AttendanceStatus)
    ) {
      return res.status(400).json({
        message: "Missing or invalid fields",
      });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentIdNum, classId: classIdNum, isArchived: false },
      select: { id: true },
    });
    if (!student) return res.status(404).json({ message: "Active student not found in class" });

    // ✅ USE PROVIDED DATE OR FALL BACK TO TODAY
    const selectedDate = req.body.date
      ? new Date(req.body.date)
      : new Date();

    selectedDate.setHours(0, 0, 0, 0);

    // ✅ END OF SELECTED DAY
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // ✅ FIND TODAY SESSION PROPERLY
    let session = await prisma.attendanceSession.findFirst({
      where: {
        classId: classIdNum,
        date: {
          gte: selectedDate,
          lt: nextDay,
        },
      },
    });

    // ✅ CREATE ONLY IF NONE EXISTS
    if (!session) {
      session = await prisma.attendanceSession.create({
        data: {
          classId: classIdNum,
          teacherId: req.user!.id,
          date: selectedDate,
          status: AttendanceSessionStatus.DRAFT,
        },
      });
    }

    // ✅ UPSERT ENTRY
    if (period === AttendancePeriod.AFTERNOON) {
      const afternoonStarted = await prisma.attendanceEntry.count({
        where: {
          attendanceSessionId: session.id,
          period: AttendancePeriod.AFTERNOON,
        },
      });
      if (afternoonStarted === 0) {
        return res.status(409).json({ message: "Start Afternoon before marking afternoon attendance" });
      }
    }

    const record = await prisma.attendanceEntry.upsert({
      where: {
        attendanceSessionId_studentId_period: {
          attendanceSessionId: session.id,
          studentId: studentIdNum,
          period,
        },
      },
      update: {
        status,
      },
      create: {
        studentId: studentIdNum,
        attendanceSessionId: session.id,
        period,
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

export async function startAfternoonAttendance(req: Request, res: Response) {
  const classId = Number(req.params.classId);
  if (Number.isNaN(classId)) return res.status(400).json({ message: "Invalid classId" });

  const date = req.body.date ? new Date(req.body.date) : new Date();
  if (Number.isNaN(date.getTime())) return res.status(400).json({ message: "Invalid date" });
  date.setHours(0, 0, 0, 0);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.attendanceSession.findFirst({
        where: { classId, date: { gte: date, lt: nextDay } },
        orderBy: { id: "desc" },
      });
      if (!session) throw { status: 400, message: "Morning attendance has not been marked" };

      const existing = await tx.attendanceEntry.findMany({
        where: { attendanceSessionId: session.id, period: AttendancePeriod.AFTERNOON },
        orderBy: { studentId: "asc" },
      });
      if (existing.length > 0) return { sessionId: session.id, initialized: true, entries: existing };

      const morning = await tx.attendanceEntry.findMany({
        where: { attendanceSessionId: session.id, period: AttendancePeriod.MORNING },
      });
      if (morning.length === 0) throw { status: 400, message: "Morning attendance has not been marked" };

      await tx.attendanceEntry.createMany({
        data: buildAfternoonCopies(morning).map((entry) => ({
          attendanceSessionId: session.id,
          studentId: entry.studentId,
          period: entry.period,
          status: entry.status,
          note: entry.note,
        })),
        skipDuplicates: true,
      });

      const entries = await tx.attendanceEntry.findMany({
        where: { attendanceSessionId: session.id, period: AttendancePeriod.AFTERNOON },
        orderBy: { studentId: "asc" },
      });
      return { sessionId: session.id, initialized: true, entries };
    });
    return res.json(result);
  } catch (error: any) {
    return res.status(error?.status ?? 500).json({
      message: error?.message ?? "Failed to start afternoon attendance",
    });
  }
}
