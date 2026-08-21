import assert from "node:assert/strict";
import test from "node:test";
import { AttendancePeriod, AttendanceStatus } from "@prisma/client";
import {
  buildAfternoonCopies,
  isAbsentForDay,
  summarizeAttendanceDays,
  summarizeCurrentAttendance,
} from "./attendanceDomain";

const morning = (status: AttendanceStatus) => [{ studentId: 1, status }];

test("afternoon initialization maps all morning statuses correctly", () => {
  assert.equal(buildAfternoonCopies(morning(AttendanceStatus.PRESENT))[0].status, AttendanceStatus.PRESENT);
  assert.equal(buildAfternoonCopies(morning(AttendanceStatus.LATE))[0].status, AttendanceStatus.PRESENT);
  assert.equal(buildAfternoonCopies(morning(AttendanceStatus.ABSENT))[0].status, AttendanceStatus.ABSENT);
  assert.equal(buildAfternoonCopies(morning(AttendanceStatus.EXCUSED))[0].status, AttendanceStatus.EXCUSED);
});

test("a full-day absence requires absent in both periods", () => {
  assert.equal(isAbsentForDay([{ period: AttendancePeriod.MORNING, status: AttendanceStatus.ABSENT }]), false);
  assert.equal(isAbsentForDay([
    { period: AttendancePeriod.MORNING, status: AttendanceStatus.ABSENT },
    { period: AttendancePeriod.AFTERNOON, status: AttendanceStatus.ABSENT },
  ]), true);
});

test("morning-only attendance remains incomplete in overview summaries", () => {
  const date = new Date("2026-08-21T00:00:00.000Z");
  assert.deepEqual(summarizeAttendanceDays([
    { date, period: AttendancePeriod.MORNING, status: AttendanceStatus.ABSENT },
  ]), {
    totalDays: 1,
    completedDays: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    incomplete: 1,
  });
  assert.deepEqual(summarizeCurrentAttendance([
    { period: AttendancePeriod.MORNING, status: AttendanceStatus.ABSENT },
  ]), {
    marked: true,
    absent: false,
    present: false,
    completed: false,
  });
});
