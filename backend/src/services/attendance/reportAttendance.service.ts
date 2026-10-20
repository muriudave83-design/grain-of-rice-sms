import { AttendancePeriod, AttendanceSessionStatus, AttendanceStatus, Prisma } from "@prisma/client";
import { summarizeAttendanceDays } from "./attendanceDomain";

export type ReportAttendanceEntry = {
  studentId: number;
  period: AttendancePeriod;
  status: AttendanceStatus;
  session: {
    id: number;
    classId: number;
    termId: number | null;
    date: Date;
    status: AttendanceSessionStatus;
  };
};

export type ReportAttendanceScope = {
  classId: number;
  termId: number;
  startDate: Date;
  endDate: Date;
};

/** Local school-calendar day, matching attendance creation and daily admin views. */
export function schoolDayRange(value: Date) {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  const endExclusive = new Date(start);
  endExclusive.setDate(endExclusive.getDate() + 1);
  return { start, endExclusive };
}

export function inclusiveSchoolDateRange(startDate: Date, endDate: Date) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

export async function resolveAttendanceTermId(client: any, classId: number, date: Date) {
  const { start, end } = inclusiveSchoolDateRange(date, date);
  const terms = await client.term.findMany({
    where: { classId, startDate: { lte: end }, endDate: { gte: start } },
    select: { id: true },
    take: 2,
  });
  return terms.length === 1 ? terms[0].id : null;
}

export function reportAttendanceWhere(
  scope: ReportAttendanceScope,
): Prisma.AttendanceEntryWhereInput {
  const { start, end } = inclusiveSchoolDateRange(scope.startDate, scope.endDate);
  return {
    session: {
      classId: scope.classId,
      date: { gte: start, lte: end },
      OR: [{ termId: scope.termId }, { termId: null }],
    },
  };
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Resolve official attendance without rewriting historical sessions.
 * Exact term links win over null-term compatibility records; within the same
 * linkage/finalization state, the latest session is authoritative for the day.
 */
export function summarizeReportAttendance(
  entries: ReportAttendanceEntry[],
  scope: ReportAttendanceScope,
) {
  const { start, end } = inclusiveSchoolDateRange(scope.startDate, scope.endDate);
  const inScope = entries.filter((entry) =>
    entry.session.classId === scope.classId &&
    entry.session.date >= start &&
    entry.session.date <= end &&
    (entry.session.termId === scope.termId || entry.session.termId === null),
  );
  const sessionsByDate = new Map<string, Map<number, ReportAttendanceEntry[]>>();
  for (const entry of inScope) {
    const key = dateKey(entry.session.date);
    const sessions = sessionsByDate.get(key) ?? new Map<number, ReportAttendanceEntry[]>();
    sessions.set(entry.session.id, [...(sessions.get(entry.session.id) ?? []), entry]);
    sessionsByDate.set(key, sessions);
  }

  const official: ReportAttendanceEntry[] = [];
  let draftDays = 0;
  for (const sessions of sessionsByDate.values()) {
    const candidates = [...sessions.values()].sort((left, right) => {
      const leftSession = left[0].session;
      const rightSession = right[0].session;
      return Number(rightSession.status === AttendanceSessionStatus.SUBMITTED) -
        Number(leftSession.status === AttendanceSessionStatus.SUBMITTED) ||
        Number(rightSession.termId === scope.termId) - Number(leftSession.termId === scope.termId) ||
        rightSession.id - leftSession.id;
    });
    const selected = candidates[0];
    if (!selected) continue;
    if (selected[0].session.status === AttendanceSessionStatus.SUBMITTED) official.push(...selected);
    else draftDays += 1;
  }

  const daily = summarizeAttendanceDays(official.map((entry) => ({
    period: entry.period,
    status: entry.status,
    date: entry.session.date,
  })));
  const attendanceRate = daily.completedDays > 0
    ? Math.round(((daily.completedDays - daily.absent) / daily.completedDays) * 100)
    : null;

  return {
    ...daily,
    attendanceRate,
    draftDays,
    hasFinalizedData: daily.totalDays > 0,
    hasCompleteFinalizedDays: daily.completedDays > 0,
    state: daily.completedDays > 0
      ? daily.incomplete > 0 ? "PARTIALLY_FINALIZED" : "FINALIZED"
      : draftDays > 0 ? "DRAFT_ONLY" : daily.totalDays > 0 ? "FINALIZED_INCOMPLETE" : "NO_DATA",
  } as const;
}

export async function loadReportAttendance(
  client: any,
  input: ReportAttendanceScope & { studentIds: number[] },
) {
  if (input.studentIds.length === 0) return new Map<number, ReturnType<typeof summarizeReportAttendance>>();
  const entries: ReportAttendanceEntry[] = await client.attendanceEntry.findMany({
    where: {
      studentId: { in: input.studentIds },
      ...reportAttendanceWhere(input),
    },
    select: {
      studentId: true,
      period: true,
      status: true,
      session: { select: { id: true, classId: true, termId: true, date: true, status: true } },
    },
  });
  return new Map(input.studentIds.map((studentId) => [
    studentId,
    summarizeReportAttendance(entries.filter((entry) => entry.studentId === studentId), input),
  ]));
}
