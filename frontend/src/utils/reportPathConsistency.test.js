import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (relative) => fs.readFileSync(new URL(relative, import.meta.url), "utf8");

test("administrator report renders authoritative incomplete and configuration states", () => {
  const source = read("../pages/student/StudentReportCardView.jsx");
  assert.match(source, /params: termId \? \{ termId \} : \{\}/);
  assert.match(source, /Review required/);
  assert.match(source, /Incomplete/);
  assert.match(source, /NO_TERM_ASSIGNMENTS/);
  assert.match(source, /Attendance summary/);
  assert.match(source, />Present</);
  assert.match(source, />Absent</);
  assert.match(source, />Late</);
  assert.doesNotMatch(source, /Attendance Rate|DRAFT_ONLY|FINALIZED_INCOMPLETE|draft attendance|submitted day\(s\) are incomplete/);
  assert.doesNotMatch(source, /average \|\| 0/);
  assert.doesNotMatch(source, /getLetterGrade/);
});

test("administrator student list supports live name search, class filtering, clear, and empty state", () => {
  const source = read("../pages/admin/AdminReportsPage.jsx");
  assert.match(source, /Search student by any name\.\.\./);
  assert.match(source, /onChange=\{\(event\) => setSearch\(event\.target\.value\)\}/);
  assert.match(source, /onClick=\{\(\) => setSearch\(""\)\}/);
  assert.match(source, /All classes/);
  assert.match(source, /No students match your search and class filter\./);
  assert.match(source, /filterAndSortReportStudents/);
});

test("legacy teacher print screen consumes server summaries and blocks partial publication", () => {
  const source = read("../pages/teacher/report-cards/ClassReportCards.jsx");
  assert.match(source, /student\.summary\?\.average/);
  assert.match(source, /student\.summary\?\.isComplete === true/);
  assert.match(source, /Incomplete results must be resolved before publication/);
  assert.doesNotMatch(source, /gradedSubjects/);
  assert.doesNotMatch(source, /getLetterGrade/);
});

test("student report list recognizes published snapshots and downloads the protected PDF", () => {
  const source = read("../pages/student/report-cards/ReportCardList.jsx");
  assert.match(source, /rc\.status === "PUBLISHED"/);
  assert.match(source, /\/report-cards\/\$\{reportCardId\}\/pdf/);
  assert.doesNotMatch(source, /\/student\/reportcards\//);
});
