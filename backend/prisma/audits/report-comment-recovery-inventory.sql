-- READ ONLY. Run against production or an isolated recovery database.
-- This inventory does not modify ReportComment or any academic record.
BEGIN;
SET TRANSACTION READ ONLY;

WITH target_teachers AS (
  SELECT id, name, email
  FROM "User"
  WHERE lower(email) IN (
    'veronica@grainofriceproject.org',
    'caroline@grainofriceproject.org'
  ) OR id IN (30, 31)
)
SELECT
  teacher.id AS "teacherId",
  teacher.name AS "teacherName",
  teacher.email AS "teacherEmail",
  comment.id AS "reportCommentId",
  comment."studentId",
  student."admissionNo",
  concat_ws(' ', student."firstName", student."lastName") AS "studentName",
  comment."teacherSubjectId",
  teacher_subject."classId",
  class.name AS "className",
  teacher_subject."subjectId",
  subject.name AS "subjectName",
  comment."termId",
  term.name AS "termName",
  term."academicYear",
  comment.comment,
  length(comment.comment) AS "commentLength",
  (btrim(comment.comment) = '') AS "isEmpty",
  comment."createdAt",
  comment."updatedAt",
  comment."updatedAt" AT TIME ZONE 'Africa/Nairobi' AS "updatedAtKenya"
FROM "ReportComment" AS comment
JOIN "TeacherSubject" AS teacher_subject ON teacher_subject.id = comment."teacherSubjectId"
JOIN target_teachers AS teacher ON teacher.id = teacher_subject."teacherId"
JOIN "Student" AS student ON student.id = comment."studentId"
JOIN "Class" AS class ON class.id = teacher_subject."classId"
JOIN "Subject" AS subject ON subject.id = teacher_subject."subjectId"
LEFT JOIN "Term" AS term ON term.id = comment."termId"
ORDER BY teacher.email, comment."updatedAt" DESC, comment.id;

-- Narrow the incident window without asserting that every empty row was overwritten.
SELECT
  comment.id AS "reportCommentId",
  comment."studentId",
  comment."teacherSubjectId",
  comment."termId",
  comment.comment,
  comment."updatedAt" AT TIME ZONE 'Africa/Nairobi' AS "updatedAtKenya"
FROM "ReportComment" AS comment
JOIN "TeacherSubject" AS teacher_subject ON teacher_subject.id = comment."teacherSubjectId"
WHERE teacher_subject."teacherId" IN (30, 31)
  AND comment."updatedAt" >= timestamptz '2026-10-21 16:30:00+03'
  AND comment."updatedAt" <  timestamptz '2026-10-21 20:30:00+03'
ORDER BY comment."updatedAt", comment.id;

COMMIT;
