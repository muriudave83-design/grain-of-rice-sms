"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceSessionService = void 0;
const client_1 = require("@prisma/client");
const auditLog_service_1 = require("../auditLog.service");
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
        return prisma.$transaction(async (tx) => {
            const classExists = await tx.class.findUnique({
                where: { id: classId },
            });
            if (!classExists) {
                throw { status: 404, message: "Class not found" };
            }
            const existing = await tx.attendanceSession.findUnique({
                where: {
                    classId_date: { classId, date },
                },
            });
            if (existing) {
                throw {
                    status: 409,
                    message: "Attendance already exists for this class and date",
                };
            }
            return tx.attendanceSession.create({
                data: {
                    classId,
                    teacherId,
                    date,
                    status: client_1.AttendanceSessionStatus.DRAFT,
                },
            });
        });
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
                action: "ATTENDANCE_SUBMITTED",
                entityType: "AttendanceSession",
                entityId: String(updated.id),
                actorUserId: String(teacherId),
                actorRole: "TEACHER", // ✅ REQUIRED FIX
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
