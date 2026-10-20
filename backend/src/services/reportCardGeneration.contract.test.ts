import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

test("snapshot generation shares the authoritative calculator and never stores missing marks as zero", () => {
  const service = read("src/services/reportCard.service.ts");
  const controller = read("src/controllers/reportCard/generateReportCards.controller.ts");
  const compatibility = read("src/utils/reportCardGenerator.ts");
  assert.match(service, /loadAuthoritativeReportResults/);
  assert.match(service, /summarizeCompleteReport/);
  assert.match(service, /existing\?\.status === ReportCardStatus\.PUBLISHED/);
  assert.match(service, /if \(!summary\.isComplete/);
  assert.doesNotMatch(service, /finalGrade \?\? 0/);
  assert.doesNotMatch(controller, /assessmentScore/);
  assert.match(compatibility, /generateReportCardsForClass/);
});

test("teacher snapshot publication rechecks authoritative values atomically", () => {
  const routes = read("src/routes/reportCardReadRoutes.ts");
  assert.match(routes, /Prisma\.TransactionIsolationLevel\.Serializable/);
  assert.match(routes, /loadAuthoritativeReportResults\(tx/);
  assert.match(routes, /Math\.abs\(entry\.average - subject\.finalGrade\) < 0\.05/);
  assert.match(routes, /REPORT_NOT_READY/);
});

test("PDF display derives percentages and summary from immutable subject snapshot entries", () => {
  const pdf = read("src/services/pdf/reportCardPdf.service.ts");
  assert.match(pdf, /Number\(entry\.total\)/);
  assert.match(pdf, /displayedPercentages/);
  assert.doesNotMatch(pdf, /SAMPLE ATTENDANCE STUDENT IDS/);
});
