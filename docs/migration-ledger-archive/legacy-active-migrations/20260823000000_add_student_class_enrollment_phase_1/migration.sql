-- Phase 1: add permanent class-membership history without removing current links.
CREATE TYPE "StudentClassEnrollmentStatus" AS ENUM ('CURRENT', 'HISTORICAL');

ALTER TABLE "Student"
ADD COLUMN "archivedAt" TIMESTAMP(3),
ALTER COLUMN "classId" DROP NOT NULL;

CREATE TABLE "StudentClassEnrollment" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "classId" INTEGER,
    "classNameSnapshot" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "status" "StudentClassEnrollmentStatus" NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentClassEnrollment_pkey" PRIMARY KEY ("id")
);

-- There is one deterministic Phase 1 row for every existing Student. Unknown
-- enrollment dates and archive timestamps deliberately remain NULL.
INSERT INTO "StudentClassEnrollment" (
    "studentId",
    "classId",
    "classNameSnapshot",
    "startedAt",
    "endedAt",
    "status",
    "source",
    "createdAt",
    "updatedAt"
)
SELECT
    student."id",
    student."classId",
    class."name",
    NULL,
    NULL,
    CASE
        WHEN student."isArchived" THEN 'HISTORICAL'::"StudentClassEnrollmentStatus"
        ELSE 'CURRENT'::"StudentClassEnrollmentStatus"
    END,
    'PHASE_1_BACKFILL',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Student" AS student
INNER JOIN "Class" AS class ON class."id" = student."classId";

CREATE INDEX "StudentClassEnrollment_studentId_status_idx"
ON "StudentClassEnrollment"("studentId", "status");

CREATE INDEX "StudentClassEnrollment_classId_idx"
ON "StudentClassEnrollment"("classId");

-- Prisma cannot declare this PostgreSQL partial unique index in schema.prisma.
CREATE UNIQUE INDEX "StudentClassEnrollment_one_current_per_student_idx"
ON "StudentClassEnrollment"("studentId")
WHERE "status" = 'CURRENT'::"StudentClassEnrollmentStatus";

ALTER TABLE "StudentClassEnrollment"
ADD CONSTRAINT "StudentClassEnrollment_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentClassEnrollment"
ADD CONSTRAINT "StudentClassEnrollment_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
