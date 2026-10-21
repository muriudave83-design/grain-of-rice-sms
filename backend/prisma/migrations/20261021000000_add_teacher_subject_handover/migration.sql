CREATE TABLE "public"."TeacherSubjectHandover" (
  "id" SERIAL NOT NULL,
  "originalTeacherSubjectId" INTEGER NOT NULL,
  "replacementTeacherSubjectId" INTEGER NOT NULL,
  "originalTeacherId" INTEGER NOT NULL,
  "replacementTeacherId" INTEGER NOT NULL,
  "classId" INTEGER NOT NULL,
  "subjectId" INTEGER NOT NULL,
  "termId" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdByAdminId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedByAdminId" INTEGER,
  "revokedAt" TIMESTAMP(6),
  CONSTRAINT "TeacherSubjectHandover_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeacherSubjectHandover_distinct_teachers" CHECK ("originalTeacherId" <> "replacementTeacherId"),
  CONSTRAINT "TeacherSubjectHandover_distinct_assignments" CHECK ("originalTeacherSubjectId" <> "replacementTeacherSubjectId"),
  CONSTRAINT "TeacherSubjectHandover_revocation_consistent" CHECK (("isActive" AND "revokedAt" IS NULL AND "revokedByAdminId" IS NULL) OR (NOT "isActive" AND "revokedAt" IS NOT NULL AND "revokedByAdminId" IS NOT NULL))
);

CREATE INDEX "TeacherSubjectHandover_replacement_scope_active_idx" ON "public"."TeacherSubjectHandover"("replacementTeacherId", "classId", "subjectId", "termId", "isActive");
CREATE INDEX "TeacherSubjectHandover_original_term_active_idx" ON "public"."TeacherSubjectHandover"("originalTeacherSubjectId", "termId", "isActive");
CREATE UNIQUE INDEX "TeacherSubjectHandover_one_active_grant_key" ON "public"."TeacherSubjectHandover"("originalTeacherSubjectId", "termId") WHERE "isActive" = true;

ALTER TABLE "public"."TeacherSubjectHandover" ADD CONSTRAINT "TeacherSubjectHandover_originalTeacherSubjectId_fkey" FOREIGN KEY ("originalTeacherSubjectId") REFERENCES "public"."TeacherSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."TeacherSubjectHandover" ADD CONSTRAINT "TeacherSubjectHandover_replacementTeacherSubjectId_fkey" FOREIGN KEY ("replacementTeacherSubjectId") REFERENCES "public"."TeacherSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."TeacherSubjectHandover" ADD CONSTRAINT "TeacherSubjectHandover_originalTeacherId_fkey" FOREIGN KEY ("originalTeacherId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."TeacherSubjectHandover" ADD CONSTRAINT "TeacherSubjectHandover_replacementTeacherId_fkey" FOREIGN KEY ("replacementTeacherId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."TeacherSubjectHandover" ADD CONSTRAINT "TeacherSubjectHandover_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."TeacherSubjectHandover" ADD CONSTRAINT "TeacherSubjectHandover_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."TeacherSubjectHandover" ADD CONSTRAINT "TeacherSubjectHandover_termId_fkey" FOREIGN KEY ("termId") REFERENCES "public"."Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."TeacherSubjectHandover" ADD CONSTRAINT "TeacherSubjectHandover_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."TeacherSubjectHandover" ADD CONSTRAINT "TeacherSubjectHandover_revokedByAdminId_fkey" FOREIGN KEY ("revokedByAdminId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
