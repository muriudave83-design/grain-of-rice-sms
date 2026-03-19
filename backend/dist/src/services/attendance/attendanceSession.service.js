"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceSessionService = void 0;
const client_1 = require("@prisma/client");
const auditLog_service_1 = require("../auditLog.service");
const client_2 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/* ------------------------------------------------------------------ */
/* TEMP stub — Phase 9 Notifications not implemented yet               */
/* Notifications must never block domain logic                          */
/* ------------------------------------------------------------------ */
const NotificationService = {
    emitEvent: (..._args) => { },
};
class AttendanceSessionService {
    // =========================
    // CREATE SESSION
    // =========================
    static async createSession({ classId, teacherId, date, }) {
        try {
            return await prisma.$transaction(async (tx) => {
                const classExists = await tx.class.findUnique({
                    where: { id: classId },
                });
                if (!classExists) {
                    throw { status: 404, message: "Class not found" };
                }
                /* ---------------------------------------------------- */
                /* Prevent multiple attendance sessions per day         */
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
                        message: "Attendance for today already exists. You can view or continue the session until tomorrow.",
                    };
                }
                return await tx.attendanceSession.create({
                    data: {
                        classId,
                        teacherId,
                        date,
                        status: client_1.AttendanceSessionStatus.DRAFT,
                    },
                });
            });
        }
        catch (error) {
            // Handle database unique constraint race condition
            if (error.code === "P2002") {
                throw {
                    status: 409,
                    message: "Attendance for today already exists. You can view or continue the session until tomorrow.",
                };
            }
            throw error;
        }
    }
    // =========================
    // SUBMIT SESSION
    // =========================
    static async submitSession(sessionId, teacherId) {
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
            if (session.status === client_1.AttendanceSessionStatus.SUBMITTED) {
                throw { status: 409, message: "Attendance already submitted" };
            }
            const updated = await tx.attendanceSession.update({
                where: { id: sessionId },
                data: { status: client_1.AttendanceSessionStatus.SUBMITTED },
            });
            // ✅ AUDIT: Attendance session submitted
            await (0, auditLog_service_1.createAuditLog)({
                action: client_2.AuditAction.ATTENDANCE_SUBMITTED,
                entityType: "AttendanceSession",
                entityId: String(updated.id),
                actorUserId: String(teacherId),
                actorRole: "TEACHER",
                metadata: {
                    classId: updated.classId,
                    date: updated.date,
                },
            });
            // 🔔 Domain notification (non-blocking)
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
            }
            catch { }
            return updated;
        });
    }
    // =========================
    // GET BY CLASS
    // =========================
    static async getByClass({ classId, requester, }) {
        if (requester.role === "TEACHER") {
            const owns = await prisma.attendanceSession.findFirst({
                where: {
                    classId,
                    teacherId: requester.teacherId,
                },
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
exports.AttendanceSessionService = AttendanceSessionService;
