import { Request, Response } from "express";
import { AttendanceSessionService } from "../../services/attendance/attendanceSession.service";

export async function createAttendanceSession(req: Request, res: Response) {
  try {
    const teacherId = req.user!.id;
    const { classId } = req.body;

    if (!classId) {
      return res.status(400).json({ message: "classId is required" });
    }

    const session = await AttendanceSessionService.createSession({
      classId: Number(classId),
      teacherId,
      date: new Date(),
    });

    return res.status(201).json(session);
  } catch (error: any) {
    return res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to create attendance session" });
  }
}
