import { Request, Response } from "express";
import { prisma } from "../../prisma/client";
import { loadReportAttendance } from "../../services/attendance/reportAttendance.service";

/** Parent attendance summary for one validated school term. Read-only. */
export const getParentAttendanceSummary = async (req: Request, res: Response) => {
  try {
    const studentId = Number(req.params.studentId);
    const termId = Number(req.query.termId);
    if (!Number.isInteger(studentId) || !Number.isInteger(termId)) {
      return res.status(400).json({ message: "Invalid parameters" });
    }

    const term = await prisma.term.findUnique({
      where: { id: termId },
      select: { id: true, classId: true, startDate: true, endDate: true },
    });
    if (!term) return res.status(404).json({ message: "Term not found" });

    const byStudent = await loadReportAttendance(prisma, {
      classId: term.classId,
      termId: term.id,
      startDate: term.startDate,
      endDate: term.endDate,
      studentIds: [studentId],
    });
    const daily = byStudent.get(studentId)!;

    return res.json({
      student: { id: studentId },
      summary: {
        PRESENT: daily.present,
        ABSENT: daily.absent,
        LATE: daily.late,
        EXCUSED: daily.excused,
        TOTAL: daily.totalDays,
        INCOMPLETE: daily.incomplete,
        RATE: daily.attendanceRate,
        DRAFT_DAYS: daily.draftDays,
        STATE: daily.state,
      },
    });
  } catch {
    return res.status(500).json({ message: "Failed to load attendance summary" });
  }
};
