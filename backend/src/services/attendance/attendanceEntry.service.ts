// backend/src/services/attendance/attendanceEntry.service.ts

import {
  PrismaClient,
  AttendanceStatus,
  AttendanceSessionStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

export class AttendanceEntryService {
  static async updateEntry({
    entryId,
    status,
    note,
    teacherId,
  }: {
    entryId: number;
    status: AttendanceStatus;
    note?: string;
    teacherId: number; // ✅ FIXED: must be number
  }) {
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
    if (entry.session.status === AttendanceSessionStatus.SUBMITTED) {
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
