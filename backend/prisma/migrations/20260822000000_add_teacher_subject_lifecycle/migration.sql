-- Add a non-destructive lifecycle state to teacher/class/subject assignments.
-- Existing rows remain active so this migration does not revoke current access.
ALTER TABLE "TeacherSubject"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Support active-assignment authorization and class/subject takeover checks.
CREATE INDEX "TeacherSubject_teacherId_isActive_idx"
ON "TeacherSubject"("teacherId", "isActive");

CREATE INDEX "TeacherSubject_classId_subjectId_isActive_idx"
ON "TeacherSubject"("classId", "subjectId", "isActive");
