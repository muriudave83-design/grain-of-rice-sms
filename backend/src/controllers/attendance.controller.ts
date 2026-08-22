import { Request, Response } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../prisma/client";
import { AttendanceSessionService } from "../services/attendance/attendanceSession.service";
import { countAbsentDays, dailyAttendanceResult, summarizeAttendanceDays } from "../services/attendance/attendanceDomain";

export class AttendanceController {
  static async submitSession(
    req: Request,
    res: Response
  ) {
    try {
      const sessionId = Number(req.params.id);
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          message: "Not authenticated",
        });
      }

      // RBAC handled in middleware
      const teacherId = user.id;

      const session =
        await AttendanceSessionService.submitSession(
          sessionId,
          teacherId
        );

      return res.json(session);
    } catch (error: unknown) {
      console.error(
        "submitSession error:",
        error
      );

      const err =
        error as {
          status?: number;
          message?: string;
        };

      return res.status(err.status || 500).json({
        message: err.message || "Server error",
      });
    }
  }
}

/**
 * ============================================================
 * ATTENDANCE REPORT (ADMIN / INSPECTION)
 * ============================================================
 */
export const getAttendanceReport = async (
  req: Request,
  res: Response
) => {
  try {
    const { classId, startDate, endDate } =
      req.query;

    if (
      !classId ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        message:
          "classId, startDate and endDate are required",
      });
    }

    const requestedClassId = Number(classId);
    const start = new Date(startDate as string);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);

    if (!Number.isInteger(requestedClassId) || Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) || start > end) {
      return res.status(400).json({ message: "Invalid class or date range" });
    }

    if (req.user?.role === Role.TEACHER) {
      const assignment = await prisma.teacherSubject.findFirst({
        where: { teacherId: req.user.id, classId: requestedClassId, isActive: true },
        select: { id: true },
      });
      if (!assignment) return res.status(403).json({ message: "You are not assigned to this class" });
    }

    const schoolClass = await prisma.class.findFirst({
      where: { id: requestedClassId, isArchived: false },
      select: { id: true },
    });
    if (!schoolClass) return res.status(404).json({ message: "Active class not found" });

    const sessions =
      await prisma.attendanceSession.findMany({
        where: {
          classId: requestedClassId,
          date: {
            gte: start,
            lte: end,
          },
        },
        select: {
          id: true,
          date: true,
        },
        orderBy: { id: "desc" },
      });

    if (sessions.length === 0) {
      return res.json({
        records: [],
        summary: {
          totalStudents: 0,
          totalStudentDays: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          incomplete: 0,
        },
      });
    }

    const latestSessionByDate = new Map<string, number>();
    for (const session of sessions) {
      const dateKey = session.date.toISOString().slice(0, 10);
      if (!latestSessionByDate.has(dateKey)) latestSessionByDate.set(dateKey, session.id);
    }
    const sessionIds = [...latestSessionByDate.values()];

        const allRecords =
          await prisma.attendanceEntry.findMany({
            where: {
              attendanceSessionId: {
                in: sessionIds,
              },
              student: { isArchived: false, classId: requestedClassId },
            },
            include: {
              student: true,
              session: true,
            },
            orderBy: {
              id: "desc",
            },
          });

        const dailyMap = new Map<string, typeof allRecords>();

        for (const record of allRecords) {
          const sessionDate = new Date(record.session.date)
            .toISOString()
            .split("T")[0];

          const key = `${record.studentId}-${sessionDate}`;

          dailyMap.set(key, [...(dailyMap.get(key) ?? []), record]);
        }

        const report = [...dailyMap.values()].map((records) => {
          const record = records[0];
          const daily = summarizeAttendanceDays(records.map((entry) => ({
            period: entry.period,
            status: entry.status,
            date: entry.session.date,
          })));
          const status = dailyAttendanceResult(records.map((entry) => ({
            period: entry.period,
            status: entry.status,
            date: entry.session.date,
          })));
          return {
        studentId: record.student.id,
        studentName: `${record.student.firstName} ${record.student.lastName}`,
        admissionNumber:
          record.student.admissionNo || "N/A",
        legacyStatus: records.find((entry) => entry.period === "LEGACY")?.status ?? null,
        morningStatus: records.find((entry) => entry.period === "MORNING")?.status ?? null,
        afternoonStatus: records.find((entry) => entry.period === "AFTERNOON")?.status ?? null,
        status,
        absentForDay: daily.absent === 1,
        date: record.session.date,
      }});

      const summary = {
        totalStudents: new Set(report.map((record) => record.studentId)).size,
        totalStudentDays: report.length,
        present: report.filter((record) => record.status === "PRESENT").length,
        absent: report.filter((record) => record.status === "ABSENT").length,
        late: report.filter((record) => record.status === "LATE").length,
        excused: report.filter((record) => record.status === "EXCUSED").length,
        incomplete: report.filter((record) => record.status === "INCOMPLETE").length,
      };

    return res.json({
      records: report,
      summary,
    });
  } catch (error: unknown) {
    console.error(
      "REPORT ERROR:",
      error
    );

    const err =
      error as {
        message?: string;
      };

    return res.status(500).json({
      message: "Server error",
      error: err.message || "Unknown error",
    });
  }
};

/**
 * ============================================================
 * STUDENT — ATTENDANCE SUMMARY
 * ============================================================
 */
export const getStudentAttendanceSummary =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          message: "Not authenticated",
        });
      }

      const student =
        await prisma.student.findFirst({
          where: {
            userId: user.id,
          },
        });

      if (!student) {
        return res.status(404).json({
          message: "Student not found",
        });
      }

      const records =
        await prisma.attendanceEntry.findMany({
          where: {
            studentId: student.id,
          },
          include: { session: true },
        });

      const daily = summarizeAttendanceDays(records.map((entry) => ({
        period: entry.period,
        status: entry.status,
        date: entry.session.date,
      })));
      const { totalDays, present, absent } = daily;

      const percentage =
        totalDays === 0
          ? 0
          : Math.round(
              ((daily.completedDays - absent) / Math.max(daily.completedDays, 1)) * 100
            );

      return res.json({
        totalDays,
        present,
        absent,
        percentage,
      });
    } catch (error: unknown) {
      console.error(
        "getStudentAttendanceSummary error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch attendance summary",
      });
    }
  };

/**
 * ============================================================
 * PARENT — GET ATTENDANCE
 * ============================================================
 */
export const getParentAttendance = async (
  req: Request,
  res: Response
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    // Resolve Parent profile from authenticated User
    const parent = await prisma.parent.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (!parent) {
      return res.status(404).json({
        message: "Parent profile not found",
      });
    }

    const links =
      await prisma.parentStudent.findMany({
        where: {
          parentId: parent.id,
        },
        select: {
          studentId: true,
        },
      });

    const studentIds = links.map(
      (link) => link.studentId
    );

    if (studentIds.length === 0) {
      return res.json([]);
    }

    const entries =
      await prisma.attendanceEntry.findMany({
        where: {
          studentId: {
            in: studentIds,
          },
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

    return res.json(entries);
  } catch (error: unknown) {
    console.error(
      "getParentAttendance error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch attendance",
    });
  }
};

/**
 * ============================================================
 * ADMIN — ABSENCE COUNT
 * ============================================================
 */
export const getStudentAbsenceCount = async (
  req: Request,
  res: Response
) => {
  try {
    const { studentId, startDate, endDate } =
      req.query;

    if (
      !studentId ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        message:
          "studentId, startDate and endDate are required",
      });
    }

    const start = new Date(startDate as string);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);

    const absenceEntries =
      await prisma.attendanceEntry.findMany({
        where: {
          studentId: Number(studentId),
          session: {
            date: {
              gte: start,
              lte: end,
            },
          },
        },
        include: { session: true },
      });
    const absentCount = countAbsentDays(absenceEntries.map((entry) => ({
      period: entry.period,
      status: entry.status,
      date: entry.session.date,
    })));

    return res.json({
      studentId: Number(studentId),
      totalAbsent: absentCount,
    });
  } catch (error: unknown) {
    console.error(
      "ABSENCE COUNT ERROR:",
      error
    );

    const err =
      error as {
        message?: string;
      };

    return res.status(500).json({
      message: "Server error",
      error: err.message || "Unknown error",
    });
  }
};
