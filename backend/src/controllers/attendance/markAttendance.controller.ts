import { Request, Response } from "express";
import { AttendancePeriod, AttendanceSessionStatus, AttendanceStatus, Role } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { buildAfternoonCopies, parseClientAttendancePeriod } from "../../services/attendance/attendanceDomain";

function parseDay(value: unknown) {
  const date = value ? new Date(String(value)) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  return { date, nextDay };
}

async function canManageClass(user: Request["user"], classId: number) {
  if (!user) return false;
  if (user.role === Role.ADMIN || user.role === Role.ATTENDANCE_OFFICER) return true;
  if (user.role !== Role.TEACHER) return false;
  return Boolean(await prisma.teacherSubject.findFirst({
    where: { teacherId: user.id, classId },
    select: { id: true },
  }));
}

export async function markAttendance(req: Request, res: Response) {
  try {
    const studentId = Number(req.body.studentId);
    const classId = Number(req.body.classId);
    const status = req.body.status as AttendanceStatus;
    const period = parseClientAttendancePeriod(req.body.period);
    const day = parseDay(req.body.date);
    if (!Number.isInteger(studentId) || !Number.isInteger(classId) || !period || !day ||
      !Object.values(AttendanceStatus).includes(status)) {
      return res.status(400).json({ message: "Missing or invalid fields" });
    }
    if (!(await canManageClass(req.user, classId))) {
      return res.status(403).json({ message: "You are not assigned to this class" });
    }
    const student = await prisma.student.findFirst({
      where: { id: studentId, classId, isArchived: false },
      select: { id: true },
    });
    if (!student) return res.status(404).json({ message: "Active student not found in class" });

    let session = await prisma.attendanceSession.findFirst({
      where: { classId, date: { gte: day.date, lt: day.nextDay } },
      orderBy: { id: "desc" },
    });
    if (!session) {
      session = await prisma.attendanceSession.create({
        data: { classId, teacherId: req.user!.id, date: day.date, status: AttendanceSessionStatus.DRAFT },
      });
    }
    if (session.status !== AttendanceSessionStatus.DRAFT) {
      return res.status(409).json({ message: "Attendance session is locked" });
    }
    if (period === AttendancePeriod.AFTERNOON) {
      const started = await prisma.attendanceEntry.count({
        where: { attendanceSessionId: session.id, period },
      });
      if (started === 0) {
        return res.status(409).json({ message: "Start Afternoon before marking afternoon attendance" });
      }
    }
    const record = await prisma.attendanceEntry.upsert({
      where: { attendanceSessionId_studentId_period: { attendanceSessionId: session.id, studentId, period } },
      update: { status },
      create: { studentId, attendanceSessionId: session.id, period, status },
    });
    return res.json(record);
  } catch (error) {
    console.error("Mark attendance error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function markAllPresent(req: Request, res: Response) {
  const classId = Number(req.body.classId);
  const period = parseClientAttendancePeriod(req.body.period);
  const day = parseDay(req.body.date);
  if (!Number.isInteger(classId) || !period || !day) {
    return res.status(400).json({ message: "Missing or invalid fields" });
  }
  if (!(await canManageClass(req.user, classId))) {
    return res.status(403).json({ message: "You are not assigned to this class" });
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      let session = await tx.attendanceSession.findFirst({
        where: { classId, date: { gte: day.date, lt: day.nextDay } }, orderBy: { id: "desc" },
      });
      if (!session) {
        session = await tx.attendanceSession.create({
          data: { classId, teacherId: req.user!.id, date: day.date, status: AttendanceSessionStatus.DRAFT },
        });
      }
      if (session.status !== AttendanceSessionStatus.DRAFT) {
        throw { status: 409, message: "Attendance session is locked" };
      }
      if (period === AttendancePeriod.AFTERNOON) {
        const started = await tx.attendanceEntry.count({ where: { attendanceSessionId: session.id, period } });
        if (started === 0) throw { status: 409, message: "Start Afternoon before marking afternoon attendance" };
      }
      const students = await tx.student.findMany({ where: { classId, isArchived: false }, select: { id: true } });
      for (const student of students) {
        await tx.attendanceEntry.upsert({
          where: { attendanceSessionId_studentId_period: { attendanceSessionId: session.id, studentId: student.id, period } },
          update: { status: AttendanceStatus.PRESENT },
          create: { attendanceSessionId: session.id, studentId: student.id, period, status: AttendanceStatus.PRESENT },
        });
      }
      return { sessionId: session.id, period, updated: students.length };
    });
    return res.json(result);
  } catch (error: any) {
    return res.status(error?.status ?? 500).json({ message: error?.message ?? "Failed to mark attendance" });
  }
}

export async function startAfternoonAttendance(req: Request, res: Response) {
  const classId = Number(req.params.classId);
  const day = parseDay(req.body.date);
  if (!Number.isInteger(classId)) return res.status(400).json({ message: "Invalid classId" });
  if (!day) return res.status(400).json({ message: "Invalid date" });
  if (!(await canManageClass(req.user, classId))) {
    return res.status(403).json({ message: "You are not assigned to this class" });
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.attendanceSession.findFirst({
        where: { classId, date: { gte: day.date, lt: day.nextDay } }, orderBy: { id: "desc" },
      });
      if (!session) throw { status: 400, message: "Morning attendance has not been marked" };
      if (session.status !== AttendanceSessionStatus.DRAFT) {
        throw { status: 409, message: "Attendance session is locked" };
      }
      const morning = await tx.attendanceEntry.findMany({
        where: { attendanceSessionId: session.id, period: AttendancePeriod.MORNING,
          student: { classId, isArchived: false } },
      });
      if (morning.length === 0) throw { status: 400, message: "Morning attendance has not been marked" };
      await tx.attendanceEntry.createMany({
        data: buildAfternoonCopies(morning).map((entry) => ({
          attendanceSessionId: session.id, studentId: entry.studentId, period: entry.period,
          status: entry.status, note: entry.note,
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
    return res.status(error?.status ?? 500).json({ message: error?.message ?? "Failed to start afternoon attendance" });
  }
}
