-- READ ONLY: discover class evidence that differs from Student.classId.
-- Evidence is intentionally not interpreted as enrollment or chronology.
WITH class_evidence AS (
    SELECT "studentId", "classId", 'REPORT_CARD'::text AS source FROM "ReportCard"
    UNION ALL
    SELECT "studentId", "classId", 'TRANSCRIPT' FROM "Transcript"
    UNION ALL
    SELECT score."studentId", assessment."classId", 'ASSESSMENT_SCORE'
    FROM "AssessmentScore" AS score
    INNER JOIN "Assessment" AS assessment ON assessment."id" = score."assessmentId"
    UNION ALL
    SELECT score."studentId", teacher_subject."classId", 'ASSIGNMENT_SCORE'
    FROM "Score" AS score
    INNER JOIN "Assignment" AS assignment ON assignment."id" = score."assignmentId"
    INNER JOIN "TeacherSubject" AS teacher_subject ON teacher_subject."id" = assignment."teacherSubjectId"
    UNION ALL
    SELECT entry."studentId", session."classId", 'ATTENDANCE'
    FROM "AttendanceEntry" AS entry
    INNER JOIN "AttendanceSession" AS session ON session."id" = entry."attendanceSessionId"
    UNION ALL
    SELECT grade."studentId", term."classId", 'GRADE'
    FROM "Grade" AS grade
    INNER JOIN "Term" AS term ON term."id" = grade."termId"
    UNION ALL
    SELECT comment."studentId", teacher_subject."classId", 'REPORT_COMMENT'
    FROM "ReportComment" AS comment
    INNER JOIN "TeacherSubject" AS teacher_subject ON teacher_subject."id" = comment."teacherSubjectId"
    UNION ALL
    SELECT discipline."studentId", term."classId", 'DISCIPLINE_TERM'
    FROM "Discipline" AS discipline
    INNER JOIN "Term" AS term ON term."id" = discipline."termId"
), distinct_evidence AS (
    SELECT DISTINCT "studentId", "classId", source
    FROM class_evidence
)
SELECT
    student."id" AS "studentId",
    student."admissionNo",
    student."classId" AS "storedClassId",
    stored_class."name" AS "storedClassName",
    evidence."classId" AS "evidenceClassId",
    evidence_class."name" AS "evidenceClassName",
    array_agg(DISTINCT evidence.source ORDER BY evidence.source) AS sources
FROM "Student" AS student
INNER JOIN "Class" AS stored_class ON stored_class."id" = student."classId"
INNER JOIN distinct_evidence AS evidence ON evidence."studentId" = student."id"
LEFT JOIN "Class" AS evidence_class ON evidence_class."id" = evidence."classId"
WHERE evidence."classId" IS DISTINCT FROM student."classId"
GROUP BY
    student."id",
    student."admissionNo",
    student."classId",
    stored_class."name",
    evidence."classId",
    evidence_class."name"
ORDER BY student."id", evidence."classId";
