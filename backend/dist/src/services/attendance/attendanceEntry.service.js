"use strict";
// backend/src/services/attendance/attendanceEntry.service.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceEntryService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AttendanceEntryService {
    static async updateEntry({ entryId, status, note, teacherId, }) {
        const entry = await prisma.attendanceEntry.findUnique({
            where: { id: entryId },
            include: { session: true },
        });
        if (!entry) {
            throw { status: 404, message: 'Entry not found' };
        }
        // ✅ FIXED: number-to-number comparison
        if (entry.session.teacherId !== teacherId) {
            throw { status: 403, message: 'Unauthorized' };
        }
        // ✅ FIXED: enum imported correctly
        if (entry.session.status === client_1.AttendanceSessionStatus.SUBMITTED) {
            throw { status: 409, message: 'Attendance session is locked' };
        }
        return prisma.attendanceEntry.update({
            where: { id: entryId },
            data: {
                status,
                note,
            },
        });
    }
}
exports.AttendanceEntryService = AttendanceEntryService;
