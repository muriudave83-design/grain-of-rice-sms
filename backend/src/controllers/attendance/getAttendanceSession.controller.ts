import { Request, Response } from "express";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

export async function getAttendanceSession(req: Request, res: Response) {
  try {
    const sessionId = Number(req.params.id);

    // ✅ Validate sessionId early
    if (isNaN(sessionId)) {
      console.warn("⚠️ Invalid session ID");

      return res.status(200).json({
        session: null,
        students: [],
        entries: [],
        message: "Invalid session ID",
      });
    }

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        entries: true,
        class: true,
      },
    });

    // ✅ FAIL-SAFE: No session → return empty, not error
    if (!session) {
      console.warn(`⚠️ Session not found: ${sessionId}`);

      return res.status(200).json({
        session: null,
        students: [],
        entries: [],
        message: "No session found",
      });
    }

    if (req.user?.role === Role.TEACHER) {
      const assignment = await prisma.teacherSubject.findFirst({
        where: { teacherId: req.user.id, classId: session.classId },
        select: { id: true },
      });
      if (!assignment) return res.status(403).json({ message: "Forbidden" });
    }

    const students = await prisma.student.findMany({
      where: { classId: session.classId, isArchived: false },
      orderBy: [
        { firstName: "asc" },
        { lastName: "asc" }
      ]
    });

    return res.status(200).json({
      session,
      students,
      entries: session.entries,
    });

  } catch (error) {
    console.error("❌ Attendance session error:", error);

    // ✅ FAIL-SAFE: Never crash UI
    return res.status(200).json({
      session: null,
      students: [],
      entries: [],
      message: "Failed to load attendance session",
    });
  }
}
