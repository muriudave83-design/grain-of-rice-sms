CREATE TYPE "public"."GradeContributionStatus" AS ENUM ('UNREVIEWED', 'INCLUDED', 'EXCLUDED');
CREATE TYPE "public"."GradeContributionMode" AS ENUM ('REVIEWING', 'ACTIVE');

ALTER TYPE "public"."AuditAction" ADD VALUE 'ASSIGNMENT_GRADE_CONTRIBUTION_REVIEWED';
ALTER TYPE "public"."AuditAction" ADD VALUE 'GRADE_CONTRIBUTION_SCOPE_ACTIVATED';

ALTER TABLE "public"."Assignment"
  ADD COLUMN "gradeContributionStatus" "public"."GradeContributionStatus",
  ADD COLUMN "gradeContributionNote" TEXT,
  ADD COLUMN "gradeContributionReviewedAt" TIMESTAMP(6);

UPDATE "public"."Assignment"
SET "gradeContributionStatus" = 'UNREVIEWED';

ALTER TABLE "public"."Assignment"
  ALTER COLUMN "gradeContributionStatus" SET NOT NULL,
  ALTER COLUMN "gradeContributionStatus" SET DEFAULT 'INCLUDED';

ALTER TABLE "public"."Grade"
  ADD COLUMN "contributionRevision" INTEGER;

CREATE TABLE "public"."GradeContributionScope" (
  "id" SERIAL NOT NULL,
  "classId" INTEGER NOT NULL,
  "subjectId" INTEGER NOT NULL,
  "termId" INTEGER NOT NULL,
  "mode" "public"."GradeContributionMode" NOT NULL DEFAULT 'REVIEWING',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "activatedAt" TIMESTAMP(6),
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(6) NOT NULL,
  CONSTRAINT "GradeContributionScope_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GradeContributionScope_class_subject_term_key"
  ON "public"."GradeContributionScope"("classId", "subjectId", "termId");
CREATE INDEX "GradeContributionScope_term_mode_idx"
  ON "public"."GradeContributionScope"("termId", "mode");
CREATE INDEX "Assignment_term_contribution_idx"
  ON "public"."Assignment"("termId", "gradeContributionStatus");

-- A non-deleted CombinedAssignment is authoritative lifecycle evidence that its
-- class-specific child Assignment remains part of the mapped Term. Ordinary
-- historical assignments deliberately remain UNREVIEWED.
UPDATE "public"."Assignment" AS assignment
SET
  "gradeContributionStatus" = 'INCLUDED',
  "gradeContributionNote" = 'Automatically included: active combined-assignment child.'
FROM "public"."CombinedAssignmentChild" AS child
JOIN "public"."CombinedAssignment" AS combined
  ON combined."id" = child."combinedAssignmentId"
WHERE child."assignmentId" = assignment."id"
  AND combined."deletedAt" IS NULL;

WITH assignment_evidence AS (
  SELECT
    teacher_subject."classId",
    teacher_subject."subjectId",
    assignment."termId",
    COUNT(*) AS assignment_count,
    COUNT(DISTINCT assignment."teacherSubjectId") AS owner_count,
    BOOL_AND(combined."id" IS NOT NULL AND combined."deletedAt" IS NULL) AS all_active_combined
  FROM "public"."Assignment" AS assignment
  JOIN "public"."TeacherSubject" AS teacher_subject
    ON teacher_subject."id" = assignment."teacherSubjectId"
  LEFT JOIN "public"."CombinedAssignmentChild" AS child
    ON child."assignmentId" = assignment."id"
  LEFT JOIN "public"."CombinedAssignment" AS combined
    ON combined."id" = child."combinedAssignmentId"
  GROUP BY teacher_subject."classId", teacher_subject."subjectId", assignment."termId"
)
INSERT INTO "public"."GradeContributionScope" (
  "classId", "subjectId", "termId", "mode", "revision", "activatedAt", "createdAt", "updatedAt"
)
SELECT
  evidence."classId",
  evidence."subjectId",
  evidence."termId",
  CASE WHEN evidence.all_active_combined THEN 'ACTIVE'::"public"."GradeContributionMode"
       ELSE 'REVIEWING'::"public"."GradeContributionMode" END,
  1,
  CASE WHEN evidence.all_active_combined THEN CURRENT_TIMESTAMP ELSE NULL END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM assignment_evidence AS evidence
WHERE evidence.all_active_combined OR evidence.owner_count > 1;
