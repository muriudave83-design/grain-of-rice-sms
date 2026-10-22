import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  displaySubjectComment,
  formatReportGrade,
  formatReportPercentage,
  PRINT_MODE,
  reportsForMode,
} from "./reportCardPresentation.js";
import { getGradeDescription, getLetterGrade } from "./grading.js";

const reports = [
  { studentId: 1, subjects: [{ teacherSubjectId: 10, comment: "English comment" }] },
  { studentId: 2, subjects: [{ teacherSubjectId: 10, comment: "Other student" }] },
];
const css = fs.readFileSync(new URL("../index.css", import.meta.url), "utf8");
const component = fs.readFileSync(new URL("../pages/teacher/Reports.jsx", import.meta.url), "utf8");
const sheet = fs.readFileSync(new URL("../components/report-cards/TeacherReportCardSheet.jsx", import.meta.url), "utf8");

test("batch and selected modes return the intended students", () => {
  assert.deepEqual(reportsForMode(reports, null, PRINT_MODE.ALL), reports);
  assert.deepEqual(reportsForMode(reports, 1, PRINT_MODE.SELECTED), [reports[0]]);
  assert.deepEqual(reportsForMode(reports, null, PRINT_MODE.SELECTED), []);
});

test("missing subject comments use a safe placeholder", () => {
  assert.equal(displaySubjectComment("English comment"), "English comment");
  assert.equal(displaySubjectComment(""), "—");
  assert.equal(displaySubjectComment(null), "—");
});

test("print structure has page boundaries and excludes controls", () => {
  assert.match(css, /\.print-card[\s\S]*break-after:\s*page/);
  assert.match(css, /\.print-card:last-child[\s\S]*break-after:\s*auto/);
  assert.match(css, /\.print-hidden[\s\S]*display:\s*none/);
  assert.match(sheet, /Subject[\s\S]*Score[\s\S]*Grade[\s\S]*Teacher Comment/);
  assert.match(component, /Print Selected Student/);
  assert.match(component, /Print All Report Cards/);
  assert.match(sheet, /subject\.canEditComment/);
  assert.match(component, /Reports include all configured subjects for this class/);
  assert.match(component, /students have complete results/);
});

test("report percentages are rounded for display only", () => {
  assert.equal(formatReportPercentage(88.9), "89%");
  assert.equal(formatReportPercentage(80), "80%");
  assert.equal(formatReportPercentage(null), "—");
  assert.equal(formatReportPercentage("not-a-score"), "—");
});

test("report grade formatting preserves legitimate modifiers without an ambiguous separator", () => {
  assert.equal(formatReportGrade("A", "Exceeding Expectations"), "A (Exceeding Expectations)");
  assert.equal(formatReportGrade("A-", "Exceeding Expectations"), "A- (Exceeding Expectations)");
  assert.equal(formatReportGrade("B-", "Meeting Expectations"), "B- (Meeting Expectations)");
});

test("teacher report uses independent percentage and grade presentation", () => {
  const rawScore = 88.9;
  assert.equal(formatReportPercentage(rawScore), "89%");
  assert.equal(getLetterGrade(rawScore), "B+");
  assert.equal(getGradeDescription(getLetterGrade(rawScore)), "Meeting Expectations");
  assert.match(sheet, /formatReportGrade\(subject\.letter, subject\.gradeDescription\)/);
  assert.doesNotMatch(sheet, /getLetterGrade\(.*formatReportPercentage/);
});

test("whole-number display does not change current grade or competency boundaries", () => {
  const cases = [
    [80, "B-", "Meeting Expectations"],
    [82, "B-", "Meeting Expectations"],
    [83, "B-", "Meeting Expectations"],
    [86, "B", "Meeting Expectations"],
    [87, "B", "Meeting Expectations"],
    [88.9, "B+", "Meeting Expectations"],
    [89, "B+", "Meeting Expectations"],
    [90, "A-", "Exceeding Expectations"],
  ];

  for (const [rawScore, letter, description] of cases) {
    assert.equal(getLetterGrade(rawScore), letter);
    assert.equal(getGradeDescription(letter), description);
    assert.match(formatReportPercentage(rawScore), /^\d+%$/);
  }
});

test("screen and print grids accommodate long subject and grade content", () => {
  const longSubjectName = "Christian Religious Education and Community Service";
  assert.ok(longSubjectName.length > 40);
  assert.match(sheet, /className="report-subject-name"[\s\S]*\{subject\.subjectName\}/);
  assert.doesNotMatch(sheet, /subjectName\.(slice|substring)\(/);
  assert.match(css, /grid-template-columns:\s*minmax\(12rem,\s*1\.6fr\)\s*minmax\(6rem,\s*0\.6fr\)\s*minmax\(13rem,\s*1\.5fr\)/);
  assert.match(css, /@media print[\s\S]*grid-template-columns:\s*30%\s*10%\s*25%\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.report-subject-name,[\s\S]*\.report-grade[\s\S]*overflow-wrap:\s*anywhere/);
  assert.match(css, /\.report-score[\s\S]*white-space:\s*nowrap/);
  assert.match(sheet, /<small className="report-score-warning">Revalidation required<\/small>/);
  assert.match(css, /\.report-score-warning\s*\{[\s\S]*display:\s*block;[\s\S]*white-space:\s*normal;[\s\S]*overflow-wrap:\s*anywhere/);
  assert.doesNotMatch(sheet, /formatReportPercentage\(subject\.finalGrade\).*revalidation required/);
});

test("A4 print rules protect rows, attendance, and student boundaries", () => {
  assert.match(css, /@page\s*\{[\s\S]*size:\s*A4 portrait;[\s\S]*margin:\s*10mm/);
  assert.match(css, /\.print-card\s*\{[\s\S]*break-after:\s*page;[\s\S]*break-inside:\s*auto/);
  assert.match(css, /\.print-card:last-child[\s\S]*break-after:\s*auto/);
  assert.match(css, /\.report-subject-row,[\s\S]*\.report-attendance[\s\S]*page-break-inside:\s*avoid;[\s\S]*break-inside:\s*avoid/);
  assert.match(sheet, /report-subject-header/);
  assert.match(sheet, /report-subject-row/);
  assert.match(sheet, /report-comment/);
  assert.match(sheet, /report-attendance/);
});

test("teacher report preserves data loading, comment saving, simplified attendance, and shared-sheet wiring", () => {
  assert.match(component, /apiClient\.get\(/);
  assert.match(component, /apiClient\.post\([\s\S]*\/teacher\/report\/comment/);
  assert.match(component, /TeacherReportCardSheet/);
  assert.match(component, /commentSaveStates=\{commentSaveStates\}/);
  assert.match(component, /onCommentBlur=\{\(subject, value\) =>\s*flushCommentSave/);
  assert.match(sheet, /student\.present/);
  assert.match(sheet, /student\.absent/);
  assert.match(sheet, /student\.late/);
  assert.doesNotMatch(sheet, /attendanceRate|attendanceDraftDays|attendanceIncompleteDays/);
  assert.match(sheet, /className="[^"]*print-card/);
});
