-- READ ONLY. Run only in an isolated database where the earlier export has
-- been imported into schema "recovery" and the comparison snapshot into
-- schema "current_snapshot". Never point this at the live production schema.
BEGIN;
SET TRANSACTION READ ONLY;

SELECT
  COALESCE(old."studentId", current."studentId") AS "studentId",
  COALESCE(old."teacherSubjectId", current."teacherSubjectId") AS "teacherSubjectId",
  COALESCE(old."termId", current."termId") AS "termId",
  old.comment AS "earlierComment",
  current.comment AS "currentComment",
  old."updatedAt" AS "earlierUpdatedAt",
  current."updatedAt" AS "currentUpdatedAt",
  CASE
    WHEN current.id IS NULL THEN 'MISSING_CURRENT'
    WHEN old.id IS NULL THEN 'NEW_CURRENT'
    WHEN old.comment IS DISTINCT FROM current.comment THEN 'TEXT_CHANGED'
    ELSE 'UNCHANGED'
  END AS "comparison"
FROM recovery."ReportComment" AS old
FULL OUTER JOIN current_snapshot."ReportComment" AS current
  ON current."studentId" = old."studentId"
 AND current."teacherSubjectId" = old."teacherSubjectId"
 AND current."termId" IS NOT DISTINCT FROM old."termId"
WHERE COALESCE(old."teacherSubjectId", current."teacherSubjectId") IN (
  SELECT id FROM current_snapshot."TeacherSubject" WHERE "teacherId" IN (30, 31)
)
AND (
  old.comment IS DISTINCT FROM current.comment
  OR old.id IS NULL
  OR current.id IS NULL
)
ORDER BY 1, 2, 3;

COMMIT;
