import { Request, Response } from "express";
import { AttendanceSessionService } from "../../services/attendance/attendanceSession.service";

export async function submitAttendanceSession(req: Request, res: Response) {
  try {
    const teacherId = req.user!.id;
    const sessionId = Number(req.params.id);

    if (!sessionId) {
      return res.status(400).json({ message: "Invalid session id" });
    }

    const session = await AttendanceSessionService.submitSession(
      sessionId,
      teacherId
    );

    return res.json(session);
  } catch (error: any) {
    return res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to submit attendance" });
  }
}
