import {
  PrismaClient,
  AttendanceSessionStatus,
} from "@prisma/client";
import { createAuditLog } from "../auditLog.service";
import { AuditAction } from "@prisma/client";

const prisma = new PrismaClient();

/* ------------------------------------------------------------------ */
/* TEMP stub — Phase 9 Notifications not implemented yet               */
/* Notifications must never block domain logic                         */
/* ------------------------------------------------------------------ */
const NotificationService = {
  emitEvent: (..._args: any[]) => {},
};

export class AttendanceSessionService {
  // =========================
  // CREATE SESSION
  // =========================
  static async createSession({
    classId,
    teacherId,
    date,
  }: {
    classId: number;
    teacherId: number;
    date: Date;
  }) {
    try {
      return await prisma.$transaction(async (tx) => {
        const classExists = await tx.class.findUnique({
          where: { id: classId },
        });

        if (!classExists) {
          throw { status: 404, message: "Class not found" };
        }

        const activeAssignment = await tx.teacherSubject.findFirst({
          where: { teacherId, classId, isActive: true },
          select: { id: true },
        });
        if (!activeAssignment) throw { status: 403, message: "Active teacher assignment required" };

        /* ---------------------------------------------------- */
        /* Prevent duplicate attendance sessions                 */
        /* ---------------------------------------------------- */
        const today = new Date(date);
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const existing = await tx.attendanceSession.findFirst({
          where: {
            classId,
            date: {
              gte: today,
              lt: tomorrow,
            },
          },
        });

        if (existing) {
          throw {
            status: 409,
            message:
              "Attendance for today already exists. You can view or continue the session until tomorrow.",
          };
        }

        return await tx.attendanceSession.create({
          data: {
            classId,
            teacherId,
            date,
            status: AttendanceSessionStatus.DRAFT,
          },
        });
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        throw {
          status: 409,
          message:
            "Attendance for today already exists. You can view or continue the session until tomorrow.",
        };
      }

      throw error;
    }
  }

  // =========================
  // SUBMIT SESSION
  // =========================
  static async submitSession(sessionId: number, teacherId: number) {
    return prisma.$transaction(async (tx) => {
      const session = await tx.attendanceSession.findUnique({
        where: { id: sessionId },
        include: {
          class: true,
          entries: true,
        },
      });

      if (!session) {
        throw { status: 404, message: "Attendance session not found" };
      }

      if (session.teacherId !== teacherId) {
        throw { status: 403, message: "Unauthorized" };
      }

      const activeAssignment = await tx.teacherSubject.findFirst({
        where: { teacherId, classId: session.classId, isActive: true },
        select: { id: true },
      });
      if (!activeAssignment) throw { status: 403, message: "Active teacher assignment required" };

      if (session.status === AttendanceSessionStatus.SUBMITTED) {
        throw { status: 409, message: "Attendance already submitted" };
      }

      const updated = await tx.attendanceSession.update({
        where: { id: sessionId },
        data: { status: AttendanceSessionStatus.SUBMITTED },
      });

      await createAuditLog({
        action: AuditAction.ATTENDANCE_SUBMITTED,
        entityType: "AttendanceSession",
        entityId: String(updated.id),
        actorUserId: String(teacherId),
        actorRole: "TEACHER",
        metadata: {
          classId: updated.classId,
          date: updated.date,
        },
      });

      try {
        NotificationService.emitEvent({
          name: "attendance.submit",
          occurredAt: new Date(),
          actor: { userId: teacherId, role: "TEACHER" },
          entity: { type: "AttendanceSession", id: updated.id },
          metadata: {
            classId: updated.classId,
            date: updated.date,
          },
        });
      } catch {}

      return updated;
    });
  }

  // =========================
  // GET BY CLASS
  // =========================
  static async getByClass({
    classId,
    requester,
  }: {
    classId: number;
    requester: { role: string; teacherId?: number };
  }) {
    if (requester.role === "TEACHER") {
      const owns = await prisma.teacherSubject.findFirst({
        where: { classId, teacherId: requester.teacherId, isActive: true },
        select: { id: true },
      });

      if (!owns) {
        throw { status: 403, message: "Unauthorized" };
      }
    }

    return prisma.attendanceSession.findMany({
      where: { classId },
      include: { entries: true },
      orderBy: { date: "desc" },
    });
  }
}
