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
 * STUDENT — ATTENDANCE SUMMARY (NEW)
 * GET /api/attendance/student
 * ============================================================
 */
export const getStudentAttendanceSummary = async (
  req: Request,
  res: Response
) => {
  try {
    const studentId = (req as any).user.id;

    // Fetch attendance entries for this student
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
 * PARENT — GET ATTENDANCE FOR ALL OWN CHILDREN
 * GET /api/attendance/parent
 * ============================================================
 */
export const getParentAttendance = async (req: Request, res: Response) => {
  try {
    const parentId = (req as any).user.id;

    // 1. Get linked students
    const links = await prisma.parentStudent.findMany({
      where: { parentId },
      select: { studentId: true },
    });

    const studentIds = links.map((l) => l.studentId);

    if (studentIds.length === 0) {
      return res.json([]);
    }

    // 2. Get attendance entries
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