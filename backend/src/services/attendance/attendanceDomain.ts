import { AttendancePeriod, AttendanceStatus } from "@prisma/client";

export const CLIENT_ATTENDANCE_PERIODS = [
  AttendancePeriod.MORNING,
  AttendancePeriod.AFTERNOON,
] as const;

export type ClientAttendancePeriod = (typeof CLIENT_ATTENDANCE_PERIODS)[number];

export type AttendanceFact = {
  period: AttendancePeriod;
  status: AttendanceStatus;
  date: Date;
};

export function parseClientAttendancePeriod(value: unknown): ClientAttendancePeriod | null {
  return CLIENT_ATTENDANCE_PERIODS.includes(value as ClientAttendancePeriod)
    ? (value as ClientAttendancePeriod)
    : null;
}

export function isAbsentForDay(entries: Pick<AttendanceFact, "period" | "status">[]): boolean {
  const legacy = entries.some(
    (entry) => entry.period === AttendancePeriod.LEGACY && entry.status === AttendanceStatus.ABSENT,
  );
  if (legacy) return true;

  const morning = entries.find((entry) => entry.period === AttendancePeriod.MORNING);
  const afternoon = entries.find((entry) => entry.period === AttendancePeriod.AFTERNOON);
  return morning?.status === AttendanceStatus.ABSENT &&
    afternoon?.status === AttendanceStatus.ABSENT;
}

export function summarizeCurrentAttendance(
  entries: Pick<AttendanceFact, "period" | "status">[],
) {
  const marked = entries.length > 0;
  const absent = marked && isAbsentForDay(entries);
  const legacy = entries.some((entry) => entry.period === AttendancePeriod.LEGACY);
  const morning = entries.some((entry) => entry.period === AttendancePeriod.MORNING);
  const afternoon = entries.some((entry) => entry.period === AttendancePeriod.AFTERNOON);
  const completed = legacy || (morning && afternoon);
  return {
    marked,
    absent,
    present: completed && !absent,
    completed,
  };
}

export function countAbsentDays(entries: AttendanceFact[]): number {
  const byDate = new Map<string, AttendanceFact[]>();
  for (const entry of entries) {
    const key = entry.date.toISOString().slice(0, 10);
    const day = byDate.get(key) ?? [];
    day.push(entry);
    byDate.set(key, day);
  }
  return [...byDate.values()].filter(isAbsentForDay).length;
}

export function summarizeAttendanceDays(entries: AttendanceFact[]) {
  const byDate = new Map<string, AttendanceFact[]>();
  for (const entry of entries) {
    const key = entry.date.toISOString().slice(0, 10);
    byDate.set(key, [...(byDate.get(key) ?? []), entry]);
  }
  let absent = 0, present = 0, late = 0, excused = 0, incomplete = 0;
  for (const day of byDate.values()) {
    const legacy = day.filter((entry) => entry.period === AttendancePeriod.LEGACY);
    if (legacy.length > 0) {
      if (legacy.some((entry) => entry.status === AttendanceStatus.ABSENT)) absent++;
      else if (legacy.some((entry) => entry.status === AttendanceStatus.LATE)) late++;
      else if (legacy.some((entry) => entry.status === AttendanceStatus.EXCUSED)) excused++;
      else present++;
      continue;
    }
    const morning = day.find((entry) => entry.period === AttendancePeriod.MORNING);
    const afternoon = day.find((entry) => entry.period === AttendancePeriod.AFTERNOON);
    if (!morning || !afternoon) { incomplete++; continue; }
    if (isAbsentForDay(day)) absent++;
    else if ([morning, afternoon].some((entry) => entry.status === AttendanceStatus.LATE)) late++;
    else if ([morning, afternoon].some((entry) => entry.status === AttendanceStatus.EXCUSED)) excused++;
    else present++;
  }
  return { totalDays: byDate.size, completedDays: byDate.size - incomplete, present, absent, late, excused, incomplete };
}

export function statusesByPeriod(
  entries: Pick<AttendanceFact, "period" | "status">[],
) {
  return {
    legacyStatus:
      entries.find((entry) => entry.period === AttendancePeriod.LEGACY)?.status ?? null,
    morningStatus:
      entries.find((entry) => entry.period === AttendancePeriod.MORNING)?.status ?? null,
    afternoonStatus:
      entries.find((entry) => entry.period === AttendancePeriod.AFTERNOON)?.status ?? null,
  };
}

export function buildAfternoonCopies<T extends { studentId: number; status: AttendanceStatus; note?: string | null }>(
  morningEntries: T[],
) {
  return morningEntries.map((entry) => ({
    studentId: entry.studentId,
    period: AttendancePeriod.AFTERNOON,
    status:
      entry.status === AttendanceStatus.LATE
        ? AttendanceStatus.PRESENT
        : entry.status,
    note: entry.note ?? null,
  }));
}
