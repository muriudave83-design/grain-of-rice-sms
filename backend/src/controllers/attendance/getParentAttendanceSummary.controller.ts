import { Request, Response } from "express";
import { prisma } from "../../prisma/client";

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

    const summary: Record<AttendanceStatus, number> & { TOTAL: number } = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
      TOTAL: entries.length,
    };

    for (const e of entries as { status: AttendanceStatus }[]) {
      summary[e.status]++;
    }

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
