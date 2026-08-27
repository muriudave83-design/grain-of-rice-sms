CREATE TABLE "TeacherSubject" (
  "id" SERIAL PRIMARY KEY,
  "teacherId" INTEGER NOT NULL,
  "subjectId" INTEGER NOT NULL,
  "classId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TeacherSubject_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "User"(id) ON DELETE CASCADE,

  CONSTRAINT "TeacherSubject_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "Subject"(id) ON DELETE CASCADE,

  CONSTRAINT "TeacherSubject_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX "TeacherSubject_unique_assignment"
ON "TeacherSubject"("teacherId","subjectId","classId");