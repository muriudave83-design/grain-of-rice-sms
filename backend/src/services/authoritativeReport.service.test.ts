import assert from "node:assert/strict";
import test from "node:test";
import { loadAuthoritativeReportResults, summarizeCompleteReport } from "./authoritativeReport.service";

function clientFixture() {
  return {
    class: { findUnique: async () => ({ name: "Grade 8" }) },
    classSubject: {
      findMany: async () => [
        {
          id: 19,
          subjectId: 9,
          subject: { name: "Music", teacherSubjects: [
            { id: 145, teacherId: 10, isActive: true, assignments: [] },
            { id: 150, teacherId: 11, isActive: true, assignments: [
              { id: 901, weight: 1, maxPoints: 20, gradeContributionStatus: "INCLUDED", scores: [{ studentId: 190, score: 19 }] },
            ] },
          ] },
        },
        {
          id: 20,
          subjectId: 10,
          subject: { name: "Agriculture", teacherSubjects: [
            { id: 151, teacherId: 11, isActive: true, assignments: [
              { id: 1001, weight: 1, maxPoints: 20, gradeContributionStatus: "INCLUDED", scores: [{ studentId: 190, score: 15 }] },
              { id: 1002, weight: 1, maxPoints: 20, gradeContributionStatus: "INCLUDED", scores: [] },
            ] },
          ] },
        },
        { id: 21, subjectId: 11, subject: { name: "C.R.E", teacherSubjects: [] } },
      ],
    },
    teachingGroupClass: { findMany: async () => [] },
    assignment: { findMany: async () => [] },
    assessment: { findMany: async () => [] },
    grade: { findMany: async () => [] },
    gradeContributionScope: { findMany: async () => [] },
    reportComment: { findMany: async () => [] },
  };
}

test("administrator report emits one official Music row and normalizes 19/20 to 95 percent", async () => {
  const { resultsByStudent } = await loadAuthoritativeReportResults(clientFixture(), {
    classId: 8,
    termId: 3,
    studentIds: [190],
  });
  const results = resultsByStudent.get(190)!;
  assert.deepEqual(results.map((subject) => subject.subjectName), ["Music", "Agriculture", "C.R.E"]);
  assert.equal(results.filter((subject) => subject.subjectName === "Music").length, 1);
  assert.equal(results[0].finalGrade, 95);
  assert.equal(results[0].grade, "A");
  assert.equal(results[0].gradeDescription, "Exceeding Expectations");
  assert.deepEqual(results[0].configurationWarnings, ["MULTIPLE_ACTIVE_TEACHER_ASSIGNMENTS"]);
  assert.equal(results[1].finalGrade, null);
  assert.equal(results[1].completenessState, "INCOMPLETE");
  assert.deepEqual(results[2].configurationWarnings, ["NO_TERM_ASSIGNMENTS"]);
  assert.equal(summarizeCompleteReport(results).isComplete, false);
});

test("overall result is computed only when every official subject is complete", () => {
  assert.deepEqual(summarizeCompleteReport([
    { finalGrade: 95, completenessState: "COMPLETE" },
    { finalGrade: 80, completenessState: "PUBLISHED" },
  ]), {
    total: 175,
    average: 87.5,
    grade: "B",
    gradeDescription: "Meeting Expectations",
    isComplete: true,
  });
  assert.equal(summarizeCompleteReport([
    { finalGrade: 95, completenessState: "COMPLETE" },
    { finalGrade: null, completenessState: "INCOMPLETE" },
  ]).average, null);
  assert.equal(summarizeCompleteReport([
    { finalGrade: 91, completenessState: "PUBLISHED", needsRevalidation: true },
  ]).isComplete, false);
});
