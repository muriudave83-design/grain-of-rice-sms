import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const frontendRoot = path.resolve(process.cwd(), "src");
const repositoryRoot = path.resolve(process.cwd(), "..");
const forbidden = /MULTIPLE_ACTIVE_TEACHER_ASSIGNMENTS|Multiple active teacher assignments\s*[—-]\s*review ownership/i;

const presentationFiles = [
  "pages/student/StudentReportCardView.jsx",
  "pages/student/report-cards/ReportCardView.jsx",
  "pages/teacher/Reports.jsx",
  "pages/teacher/report-cards/ClassReportCards.jsx",
  "pages/teacher/report-cards/TeacherReportCardView.jsx",
  "pages/parent/report-cards/ReportCardView.jsx",
  "pages/parent/report-cards/ParentReportCardView.jsx",
  "components/report-cards/TeacherReportCardSheet.jsx",
  "index.css",
].map((file) => path.join(frontendRoot, file));

test("internal ownership warnings are absent from browser report-card and print presentations", () => {
  for (const file of presentationFiles) {
    assert.doesNotMatch(fs.readFileSync(file, "utf8"), forbidden, file);
  }
});

test("generated report-card PDFs do not render internal ownership warnings", () => {
  const pdfService = path.join(repositoryRoot, "backend/src/services/pdf/reportCardPdf.service.ts");
  assert.doesNotMatch(fs.readFileSync(pdfService, "utf8"), forbidden);
});

test("genuine report safeguards remain visible", () => {
  const administratorReport = fs.readFileSync(
    path.join(frontendRoot, "pages/student/StudentReportCardView.jsx"),
    "utf8",
  );
  const teacherReport = fs.readFileSync(
    path.join(frontendRoot, "components/report-cards/TeacherReportCardSheet.jsx"),
    "utf8",
  );
  assert.match(administratorReport, /NO_TERM_ASSIGNMENTS/);
  assert.match(administratorReport, /PUBLISHED_GRADE_NEEDS_REVALIDATION/);
  assert.match(administratorReport, /Review required/);
  assert.match(teacherReport, /Revalidation required/);
  assert.match(teacherReport, /Incomplete/);
});
