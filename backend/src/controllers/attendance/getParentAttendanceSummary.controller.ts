import { Request, Response } from "express";
import { prisma } from "../../prisma/client";
import { summarizeAttendanceDays } from "../../services/attendance/attendanceDomain";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

/**
 * Parent attendance summary (aggregated)
 * READ-ONLY
 */
export const getParentAttendanceSummary = async (
  req: Request,
  res: Response
) => {
  try {
    const studentId = Number(req.params.studentId);
    const termId = Number(req.query.termId);

    if (Number.isNaN(studentId) || Number.isNaN(termId)) {
      return res.status(400).json({ message: "Invalid parameters" });
    }

    const entries = await prisma.attendanceEntry.findMany({
    where: {
        studentId,
    },
    select: {
        status: true,
        period: true,
        session: {
        select: {
            id: true,
            // keep minimal – just enough to filter
            classId: true,
            date: true,
        },
        },
    },
    });


    if (entries.length === 0) {
      return res.json({
        student: { id: studentId },
        summary: null,
      });
    }

    const daily = summarizeAttendanceDays(entries.map((entry) => ({
      period: entry.period,
      status: entry.status,
      date: entry.session.date,
    })));
    const summary = {
      PRESENT: daily.present,
      ABSENT: daily.absent,
      LATE: daily.late,
      EXCUSED: daily.excused,
      TOTAL: daily.totalDays,
      INCOMPLETE: daily.incomplete,
    };

    return res.json({
      student: { id: studentId },
      summary,
    });
  } catch {
    return res.status(500).json({
      message: "Failed to load attendance summary",
    });
  }
};
