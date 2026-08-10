-- Forward-only attendance V2 migration.
-- Existing rows are preserved as LEGACY; no status or attendance record is changed/deleted.
BEGIN;

CREATE TYPE "AttendancePeriod" AS ENUM ('LEGACY', 'MORNING', 'AFTERNOON');

ALTER TABLE "AttendanceEntry"
ADD COLUMN "period" "AttendancePeriod" NOT NULL DEFAULT 'LEGACY';

DROP INDEX "AttendanceEntry_attendanceSessionId_studentId_key";

CREATE UNIQUE INDEX "AttendanceEntry_attendanceSessionId_studentId_period_key"
ON "AttendanceEntry"("attendanceSessionId", "studentId", "period");

COMMIT;
