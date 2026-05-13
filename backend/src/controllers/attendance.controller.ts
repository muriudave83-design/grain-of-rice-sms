import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { AttendanceSessionService } from "../services/attendance/attendanceSession.service";

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

    const start = new Date(startDate as string);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);

    const sessions =
      await prisma.attendanceSession.findMany({
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

    const sessionIds = sessions.map(
      (session) => session.id
    );

        const allRecords =
          await prisma.attendanceEntry.findMany({
            where: {
              attendanceSessionId: {
                in: sessionIds,
              },
            },
            include: {
              student: true,
              session: true,
            },
            orderBy: {
              id: "desc",
            },
          });

        const latestMap = new Map();

        for (const record of allRecords) {
          const sessionDate = new Date(record.session.date)
            .toISOString()
            .split("T")[0];

          const key = `${record.studentId}-${sessionDate}`;

          if (!latestMap.has(key)) {
            latestMap.set(key, record);
          }
        }

        const absentRecords = [...latestMap.values()].filter(
          (record) => record.status === "ABSENT"
        );

    const report = absentRecords.map(
      (record) => ({
        studentId: record.student.id,
        studentName: `${record.student.firstName} ${record.student.lastName}`,
        admissionNumber:
          record.student.admissionNo || "N/A",
        status: record.status,
        date: record.session.date,
      })
    );

    const summary: Record<
      string,
      {
        studentName: string;
        admissionNumber: string;
        totalAbsent: number;
      }
    > = {};

    report.forEach((record) => {
      if (!summary[record.studentName]) {
        summary[record.studentName] = {
          studentName: record.studentName,
          admissionNumber:
            record.admissionNumber,
          totalAbsent: 0,
        };
      }

      summary[record.studentName].totalAbsent += 1;
    });

    return res.json({
      records: report,
      summary: Object.values(summary),
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
        });

      const totalDays = records.length;

      const present = records.filter(
        (record) =>
          record.status === "PRESENT"
      ).length;

      const absent = records.filter(
        (record) =>
          record.status === "ABSENT"
      ).length;

      const percentage =
        totalDays === 0
          ? 0
          : Math.round(
              (present / totalDays) * 100
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

    const absentCount =
      await prisma.attendanceEntry.count({
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