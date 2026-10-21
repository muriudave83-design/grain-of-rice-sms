import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  filterExcludedReportSubjects,
  findUnbackedCombinedLabelSubjectIds,
} from "./officialReportSubjects.service";

const classSubjects = [
  { id: 10, subjectId: 100, subject: { name: "GRADE 8–9 KISWAHILI" } },
  { id: 11, subjectId: 101, subject: { name: "GRADE 8 KISWAHILI" } },
  { id: 12, subjectId: 102, subject: { name: "Music" } },
];
const groupLanes = [{
  classSubjectId: 11,
  classSubject: { subjectId: 101 },
  teachingGroup: { name: " Grade 8-9  Kiswahili " },
}];

test("an unbacked combined-group display label is not an official report subject", () => {
  const excluded = findUnbackedCombinedLabelSubjectIds({ classSubjects, groupLanes, evidenceSubjectIds: [] });
  assert.deepEqual([...excluded], [100]);
  assert.deepEqual(
    filterExcludedReportSubjects(classSubjects, excluded).map((entry) => entry.subject.name),
    ["GRADE 8 KISWAHILI", "Music"],
  );
});

test("the legitimate class-specific lane subject and its marks are preserved", () => {
  const excluded = findUnbackedCombinedLabelSubjectIds({ classSubjects, groupLanes, evidenceSubjectIds: [101] });
  assert.equal(excluded.has(101), false);
});

test("an incomplete official subject is preserved when it is not a combined-group label", () => {
  const excluded = findUnbackedCombinedLabelSubjectIds({ classSubjects, groupLanes, evidenceSubjectIds: [] });
  assert.equal(excluded.has(102), false);
});

test("a label-shaped subject with academic evidence is flagged for configuration review, not hidden", () => {
  const excluded = findUnbackedCombinedLabelSubjectIds({ classSubjects, groupLanes, evidenceSubjectIds: [100] });
  assert.equal(excluded.has(100), false);
});

test("a group name is harmless when it is itself the configured class lane", () => {
  const ownLane = [{ classSubjectId: 10, classSubject: { subjectId: 100 }, teachingGroup: { name: "GRADE 8-9 KISWAHILI" } }];
  const excluded = findUnbackedCombinedLabelSubjectIds({ classSubjects, groupLanes: ownLane, evidenceSubjectIds: [] });
  assert.equal(excluded.has(100), false);
});

test("teacher generation, published API views, and PDFs share the official-subject filter", () => {
  const authoritative = fs.readFileSync(path.resolve(process.cwd(), "src/services/authoritativeReport.service.ts"), "utf8");
  const snapshots = fs.readFileSync(path.resolve(process.cwd(), "src/services/reportCardSnapshotPresentation.service.ts"), "utf8");
  const routes = fs.readFileSync(path.resolve(process.cwd(), "src/routes/reportCardReadRoutes.ts"), "utf8");
  const pdf = fs.readFileSync(path.resolve(process.cwd(), "src/services/pdf/reportCardPdf.service.ts"), "utf8");
  assert.match(authoritative, /loadExcludedCombinedLabelSubjectIds/);
  assert.match(snapshots, /presentOfficialReportCardSnapshot/);
  assert.match(routes, /presentOfficialReportCardSnapshot/);
  assert.match(pdf, /officialSubjects/);
  assert.doesNotMatch(pdf, /for \(const entry of reportCard\.subjects\)/);
});
