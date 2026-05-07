import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { AttendanceSessionService } from "../services/attendance/attendanceSession.service";

export class AttendanceController {
  static async submitSession(req: Request, res: Response) {
    try {
      const sessionId = Number(req.params.id);
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const teacherId = user.id;

      const session =
        await AttendanceSessionService.submitSession(sessionId, teacherId);

      res.json(session);
    } catch (err: any) {
      res.status(err.status || 500).json({
        message: err.message || "Server error",
      });
    }
  }
}

/**
 * ============================================================
 * ✅ ATTENDANCE REPORT (ADMIN / INSPECTION)
 * ============================================================
 */
export const getAttendanceReport = async (req: any, res: any) => {
  try {
    const { classId, startDate, endDate } = req.query;

    if (!classId || !startDate || !endDate) {
      return res.status(400).json({
        message: "classId, startDate and endDate are required",
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // ✅ Step 1: Get ALL sessions in range
    const sessions = await prisma.attendanceSession.findMany({
      where: {
        classId: Number(classId),
        date: {
          gte: start,
          lte: end,
        },
      },
      select: {
        id: true,
        date: true,
      },
    });

    if (sessions.length === 0) {
      return res.json({
        records: [],
        summary: [],
      });
    }

    const sessionIds = sessions.map((s) => s.id);

    // ✅ Step 2: Get ALL absent records across sessions
    const absentRecords = await prisma.attendanceEntry.findMany({
      where: {
        attendanceSessionId: { in: sessionIds },
        status: "ABSENT",
      },
      include: {
        student: true,
        session: true,
      },
    });

    // ✅ Step 3: Format records (FIXED admission 🔥)
    const report = absentRecords.map((r: any) => ({
      studentName: `${r.student.firstName} ${r.student.lastName}`,
      admissionNumber:
        r.student.admissionNumber ||
        r.student.admissionNo ||
        "N/A",
      status: r.status,
      date: r.session.date,
    }));

    // ✅ Step 4: Build summary (VERY IMPORTANT 🚀)
    const summary: any = {};

    report.forEach((r) => {
      if (!summary[r.studentName]) {
        summary[r.studentName] = {
          studentName: r.studentName,
          admissionNumber: r.admissionNumber,
          totalAbsent: 0,
        };
      }

      summary[r.studentName].totalAbsent += 1;
    });

    const summaryList = Object.values(summary);

    // ✅ FINAL RESPONSE (NEW STRUCTURE)
    return res.json({
      records: report,
      summary: summaryList,
    });
  } catch (err: any) {
    console.error("🔥 REPORT ERROR:", err);

    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

/**
 * ============================================================
 * STUDENT — ATTENDANCE SUMMARY
 * ============================================================
 */
export const getStudentAttendanceSummary = async (
  req: Request,
  res: Response
) => {
  try {
    const studentId = (req as any).user.id;

    const records = await prisma.attendanceEntry.findMany({
      where: {
        studentId,
      },
    });

    const totalDays = records.length;
    const present = records.filter((r) => r.status === "PRESENT").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;

    const percentage =
      totalDays === 0 ? 0 : Math.round((present / totalDays) * 100);

    res.json({
      totalDays,
      present,
      absent,
      percentage,
    });
  } catch (error) {
    console.error("getStudentAttendanceSummary error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch attendance summary" });
  }
};

/**
 * ============================================================
 * PARENT — GET ATTENDANCE
 * ============================================================
 */
export const getParentAttendance = async (req: Request, res: Response) => {
  try {
    const parentId = (req as any).user.id;

    const links = await prisma.parentStudent.findMany({
      where: { parentId },
      select: { studentId: true },
    });

    const studentIds = links.map((l) => l.studentId);

    if (studentIds.length === 0) {
      return res.json([]);
    }

    const entries = await prisma.attendanceEntry.findMany({
      where: {
        studentId: { in: studentIds },
      },
      include: {
        session: {
          include: {
            class: true,
          },
        },
        student: true,
      },
      orderBy: {
        id: "desc",
      },
    });

    res.json(entries);
  } catch (err) {
    console.error("getParentAttendance error:", err);
    res.status(500).json({ message: "Failed to fetch attendance" });
  }
};

export const getStudentAbsenceCount = async (req: Request, res: Response) => {
  try {
    const { studentId, startDate, endDate } = req.query;

    if (!studentId || !startDate || !endDate) {
      return res.status(400).json({
        message: "studentId, startDate and endDate are required",
      });
    }

    const start = new Date(startDate as string);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);

    // ✅ Count ABSENT entries
    const absentCount = await prisma.attendanceEntry.count({
      where: {
        studentId: Number(studentId),
        status: "ABSENT",
        session: {
          date: {
            gte: start,
            lte: end,
          },
        },
      },
    });

    return res.json({
      studentId,
      totalAbsent: absentCount,
    });
  } catch (err: any) {
    console.error("ABSENCE COUNT ERROR:", err);

    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};