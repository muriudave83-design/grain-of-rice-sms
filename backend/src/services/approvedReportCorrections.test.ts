import assert from "node:assert/strict";
import test from "node:test";
import { loadAuthoritativeReportResults } from "./authoritativeReport.service";

const approved = new Map([[189, 81], [190, 85], [191, 81]]);

function fixture() {
  return {
    class: { findUnique: async () => ({ name: "Grade 8" }) },
    classSubject: { findMany: async () => [{
      id: 22,
      subjectId: 69,
      subject: {
        name: "Creative Arts and Sports",
        teacherSubjects: [{
          id: 500,
          teacherId: 24,
          isActive: true,
          createdAt: new Date("2026-01-01"),
          _count: { assignments: 1 },
          assignments: [{
            id: 454,
            weight: 1,
            maxPoints: 100,
            gradeContributionStatus: "INCLUDED",
            scores: [
              { studentId: 189, score: 77 },
              { studentId: 190, score: 77 },
              { studentId: 191, score: 79 },
              { studentId: 192, score: 74 },
            ],
          }],
        }],
      },
    }] },
    grade: { findMany: async () => [
      ...Array.from(approved, ([studentId, total]) => ({ studentId, subjectId: 69, total, contributionRevision: null })),
      { studentId: 192, subjectId: 69, total: 74, contributionRevision: null },
    ] },
    gradeContributionScope: { findMany: async () => [] },
    reportComment: { findMany: async () => [] },
    teacherSubjectHandover: { findMany: async () => [] },
    teachingGroupClass: { findMany: async () => [] },
    teachingGroup: { findMany: async () => [] },
    assignment: { findMany: async () => [] },
    assessment: { findMany: async () => [] },
    auditLog: { findMany: async () => Array.from(approved, ([studentId, approvedScore]) => ({ metadata: {
      reason: "Administrator-approved final report-card correction",
      authorizedBy: "Ammy",
      authorizedAt: "2026-10-23",
      studentId,
      subjectId: 69,
      termId: 44,
      approvedScore,
    } })) },
  };
}

test("official reports use Ammy's three approved published results and preserve an unaffected student", async () => {
  const { resultsByStudent } = await loadAuthoritativeReportResults(fixture(), {
    classId: 22,
    termId: 44,
    studentIds: [189, 190, 191, 192],
  });

  for (const [studentId, expected] of approved) {
    const result = resultsByStudent.get(studentId)?.find((entry) => entry.subjectId === 69);
    assert.equal(result?.finalGrade, expected);
    assert.equal(result?.grade, expected === 85 ? "B" : "B-");
    assert.equal(result?.gradeDescription, "Meeting Expectations");
    assert.equal(result?.resultSource, "published-grade");
    assert.equal(result?.needsRevalidation, false);
  }

  const unaffected = resultsByStudent.get(192)?.find((entry) => entry.subjectId === 69);
  assert.equal(unaffected?.finalGrade, 74);
  assert.equal(unaffected?.grade, "C");
  assert.equal(unaffected?.gradeDescription, "Approaching Expectations");
});
