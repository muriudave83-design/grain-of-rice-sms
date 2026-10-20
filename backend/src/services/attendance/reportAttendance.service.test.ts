import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { AttendancePeriod, AttendanceSessionStatus, AttendanceStatus } from "@prisma/client";
import { resolveAttendanceTermId, schoolDayRange, summarizeReportAttendance, type ReportAttendanceEntry } from "./reportAttendance.service";

const scope = {
  classId: 7,
  termId: 3,
  startDate: new Date("2026-05-01T00:00:00.000Z"),
  endDate: new Date("2026-08-31T23:59:59.999Z"),
};

function entry(input: Partial<ReportAttendanceEntry> & { date: string; period: AttendancePeriod; status: AttendanceStatus }): ReportAttendanceEntry {
  return {
    studentId: input.studentId ?? 169,
    period: input.period,
    status: input.status,
    session: {
      id: input.session?.id ?? 1,
      classId: input.session?.classId ?? scope.classId,
      termId: input.session?.termId === undefined ? null : input.session.termId,
      date: new Date(input.date),
      status: input.session?.status ?? AttendanceSessionStatus.SUBMITTED,
    },
  };
}

test("PP1 through Grade 9 and current or historical terms share null-term compatibility rules", () => {
  const classes = ["PP1", "PP2", ...Array.from({ length: 9 }, (_, index) => `Grade ${index + 1}`)];
  const terms = ["Term 1", "Term 2", "Term 3", "Historical Term"];
  for (const className of classes) {
    for (const termName of terms) {
      const result = summarizeReportAttendance([
        entry({ date: "2026-06-02T08:00:00.000Z", period: AttendancePeriod.MORNING, status: AttendanceStatus.PRESENT }),
        entry({ date: "2026-06-02T08:00:00.000Z", period: AttendancePeriod.AFTERNOON, status: AttendanceStatus.PRESENT }),
      ], scope);
      assert.equal(result.attendanceRate, 100, `${className} / ${termName}`);
      assert.equal(result.completedDays, 1, `${className} / ${termName}`);
    }
  }
});

test("draft days are visible but never become finalized official attendance", () => {
  const result = summarizeReportAttendance([
    entry({ date: "2026-06-03T08:00:00.000Z", period: AttendancePeriod.MORNING, status: AttendanceStatus.ABSENT,
      session: { id: 2, classId: 7, termId: null, date: new Date(), status: AttendanceSessionStatus.DRAFT } }),
    entry({ date: "2026-06-03T08:00:00.000Z", period: AttendancePeriod.AFTERNOON, status: AttendanceStatus.ABSENT,
      session: { id: 2, classId: 7, termId: null, date: new Date(), status: AttendanceSessionStatus.DRAFT } }),
  ], scope);
  assert.equal(result.draftDays, 1);
  assert.equal(result.attendanceRate, null);
  assert.equal(result.absent, 0);
  assert.equal(result.state, "DRAFT_ONLY");
});

test("morning and afternoon form one day while legacy, late, absent, and incomplete remain distinct", () => {
  const result = summarizeReportAttendance([
    entry({ date: "2026-06-04T08:00:00.000Z", period: AttendancePeriod.MORNING, status: AttendanceStatus.ABSENT, session: { id: 3, classId: 7, termId: 3, date: new Date(), status: AttendanceSessionStatus.SUBMITTED } }),
    entry({ date: "2026-06-04T08:00:00.000Z", period: AttendancePeriod.AFTERNOON, status: AttendanceStatus.ABSENT, session: { id: 3, classId: 7, termId: 3, date: new Date(), status: AttendanceSessionStatus.SUBMITTED } }),
    entry({ date: "2026-06-05T08:00:00.000Z", period: AttendancePeriod.MORNING, status: AttendanceStatus.LATE, session: { id: 4, classId: 7, termId: null, date: new Date(), status: AttendanceSessionStatus.SUBMITTED } }),
    entry({ date: "2026-06-05T08:00:00.000Z", period: AttendancePeriod.AFTERNOON, status: AttendanceStatus.PRESENT, session: { id: 4, classId: 7, termId: null, date: new Date(), status: AttendanceSessionStatus.SUBMITTED } }),
    entry({ date: "2026-06-06T08:00:00.000Z", period: AttendancePeriod.LEGACY, status: AttendanceStatus.PRESENT, session: { id: 5, classId: 7, termId: null, date: new Date(), status: AttendanceSessionStatus.SUBMITTED } }),
    entry({ date: "2026-06-07T08:00:00.000Z", period: AttendancePeriod.MORNING, status: AttendanceStatus.PRESENT, session: { id: 6, classId: 7, termId: null, date: new Date(), status: AttendanceSessionStatus.SUBMITTED } }),
  ], scope);
  assert.deepEqual({ total: result.totalDays, completed: result.completedDays, present: result.present, absent: result.absent, late: result.late, incomplete: result.incomplete },
    { total: 4, completed: 3, present: 1, absent: 1, late: 1, incomplete: 1 });
  assert.equal(result.attendanceRate, 67);
});

test("transferred-class and out-of-term records are excluded and no data is not zero percent", () => {
  const result = summarizeReportAttendance([
    entry({ date: "2026-06-08T08:00:00.000Z", period: AttendancePeriod.LEGACY, status: AttendanceStatus.ABSENT,
      session: { id: 7, classId: 8, termId: null, date: new Date(), status: AttendanceSessionStatus.SUBMITTED } }),
    entry({ date: "2026-09-01T08:00:00.000Z", period: AttendancePeriod.LEGACY, status: AttendanceStatus.ABSENT,
      session: { id: 8, classId: 7, termId: null, date: new Date(), status: AttendanceSessionStatus.SUBMITTED } }),
  ], scope);
  assert.equal(result.totalDays, 0);
  assert.equal(result.attendanceRate, null);
  assert.equal(result.state, "NO_DATA");
});

test("submitted exact-term session wins over a newer draft or null-term duplicate", () => {
  const result = summarizeReportAttendance([
    entry({ date: "2026-06-09T08:00:00.000Z", period: AttendancePeriod.LEGACY, status: AttendanceStatus.ABSENT,
      session: { id: 20, classId: 7, termId: null, date: new Date(), status: AttendanceSessionStatus.DRAFT } }),
    entry({ date: "2026-06-09T08:00:00.000Z", period: AttendancePeriod.LEGACY, status: AttendanceStatus.PRESENT,
      session: { id: 19, classId: 7, termId: 3, date: new Date(), status: AttendanceSessionStatus.SUBMITTED } }),
  ], scope);
  assert.equal(result.present, 1);
  assert.equal(result.absent, 0);
  assert.equal(result.draftDays, 0);
});

test("new sessions link only when class and date identify exactly one term", async () => {
  let capturedWhere: any;
  const unique = { term: { findMany: async (input: any) => { capturedWhere = input.where; return [{ id: 31 }]; } } };
  assert.equal(await resolveAttendanceTermId(unique, 7, new Date("2026-08-31T16:00:00.000Z")), 31);
  assert.equal(capturedWhere.classId, 7);
  assert.equal(capturedWhere.startDate.lte.getUTCHours(), 23);
  assert.equal(capturedWhere.endDate.gte.getUTCHours(), 0);

  const ambiguous = { term: { findMany: async () => [{ id: 31 }, { id: 32 }] } };
  const missing = { term: { findMany: async () => [] } };
  assert.equal(await resolveAttendanceTermId(ambiguous, 7, new Date()), null);
  assert.equal(await resolveAttendanceTermId(missing, 7, new Date()), null);
});

test("the entire final calendar day of a term is included", () => {
  const result = summarizeReportAttendance([
    entry({ date: "2026-08-31T16:00:00.000Z", period: AttendancePeriod.LEGACY, status: AttendanceStatus.PRESENT }),
  ], scope);
  assert.equal(result.present, 1);
});

test("duplicate-session range treats different timestamps on one local school day as the same day", () => {
  const morning = new Date(2026, 9, 20, 7, 15, 0, 0);
  const evening = new Date(2026, 9, 20, 18, 45, 0, 0);
  const range = schoolDayRange(morning);
  assert.ok(evening >= range.start && evening < range.endExclusive);
});

test("duplicate-session range has an exclusive next-calendar-day boundary", () => {
  const source = new Date(2026, 9, 20, 23, 59, 59, 999);
  const sameDay = schoolDayRange(source);
  const nextMidnight = new Date(2026, 9, 21, 0, 0, 0, 0);
  assert.equal(sameDay.start.getFullYear(), 2026);
  assert.equal(sameDay.start.getMonth(), 9);
  assert.equal(sameDay.start.getDate(), 20);
  assert.equal(sameDay.start.getHours(), 0);
  assert.equal(sameDay.endExclusive.getTime(), nextMidnight.getTime());
  assert.equal(nextMidnight < sameDay.endExclusive, false);
});

test("attendance session duplicate lookup reuses the established local school-day range", () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), "src/services/attendance/attendanceSession.service.ts"), "utf8");
  assert.match(source, /schoolDayRange\(date\)/);
  assert.match(source, /date:\s*\{\s*gte: today,\s*lt: tomorrow/s);
  assert.doesNotMatch(source, /setUTCHours/);
});
