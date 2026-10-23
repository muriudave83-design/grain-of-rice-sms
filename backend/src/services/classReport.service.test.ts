import assert from "node:assert/strict";
import test from "node:test";
import { assembleClassReports } from "./classReport.service";

test("shared class report assembly preserves official results, comments, and attendance", () => {
  const subjects = [{
    subjectId: 4,
    subjectName: "Mathematics",
    finalGrade: 88.9,
    grade: "B+",
    gradeDescription: "Meeting Expectations",
    completenessState: "COMPLETE",
    comment: "Strong progress",
    canEditComment: false,
  }];
  const reports = assembleClassReports(
    [{ id: 7, firstName: "Amina", lastName: "Otieno", admissionNo: "GRA-007" }],
    new Map([[7, subjects]]),
    new Map([[7, { present: 51, absent: 2, late: 1, attendanceRate: 96, state: "FINALIZED", draftDays: 0, incomplete: 0 }]]),
  );

  assert.deepEqual(reports, [{
    studentId: 7,
    name: "Amina Otieno",
    admissionNo: "GRA-007",
    subjects: [{ ...subjects[0], letter: "B+", status: "complete" }],
    present: 51,
    absent: 2,
    late: 1,
    attendanceRate: 96,
    attendanceState: "FINALIZED",
    attendanceDraftDays: 0,
    attendanceIncompleteDays: 0,
  }]);
});

test("shared class report assembly marks null results incomplete", () => {
  const reports = assembleClassReports(
    [{ id: 8, firstName: "Noah", lastName: "Kimani", admissionNo: "GRA-008" }],
    new Map([[8, [{ finalGrade: null, grade: null, completenessState: "INCOMPLETE" }]]]),
    new Map([[8, { present: 0, absent: 0, late: 0, state: "NO_DATA", draftDays: 0, incomplete: 0 }]]),
  );
  assert.equal(reports[0].subjects[0].status, "incomplete");
});
