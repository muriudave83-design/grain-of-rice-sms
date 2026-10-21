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

test("Grade 3 Mathematics keeps the evidenced class-specific subject and removes its empty generic duplicate", () => {
  const subjects = [
    { id: 30, subjectId: 300, subject: { name: "GRADE 3 MATHEMATICS" } },
    { id: 31, subjectId: 301, subject: { name: "MATHEMATICS" } },
  ];
  const excluded = findUnbackedCombinedLabelSubjectIds({
    className: "Grade 3",
    classSubjects: subjects,
    groupLanes: [],
    evidenceSubjectIds: [300],
  });
  assert.deepEqual([...excluded], [301]);
  assert.deepEqual(filterExcludedReportSubjects(subjects, excluded).map((entry) => entry.subject.name), ["GRADE 3 MATHEMATICS"]);
});

test("class prefixes are only equivalent inside their own class", () => {
  const subjects = [
    { id: 40, subjectId: 400, subject: { name: "GRADE 3 MATHEMATICS" } },
    { id: 41, subjectId: 401, subject: { name: "MATHEMATICS" } },
  ];
  const excluded = findUnbackedCombinedLabelSubjectIds({
    className: "Grade 4",
    classSubjects: subjects,
    groupLanes: [],
    evidenceSubjectIds: [400],
  });
  assert.equal(excluded.size, 0);
});

test("equivalent incomplete subjects remain visible when neither has academic evidence", () => {
  const subjects = [
    { id: 50, subjectId: 500, subject: { name: "GRADE 3 SCIENCE" } },
    { id: 51, subjectId: 501, subject: { name: "SCIENCE" } },
  ];
  const excluded = findUnbackedCombinedLabelSubjectIds({
    className: "Grade 3",
    classSubjects: subjects,
    groupLanes: [],
    evidenceSubjectIds: [],
  });
  assert.equal(excluded.size, 0);
});

test("conflicting academic evidence preserves both equivalent subject configurations", () => {
  const subjects = [
    { id: 60, subjectId: 600, subject: { name: "GRADE 3 MATHEMATICS" } },
    { id: 61, subjectId: 601, subject: { name: "MATHEMATICS" } },
  ];
  const excluded = findUnbackedCombinedLabelSubjectIds({
    className: "Grade 3",
    classSubjects: subjects,
    groupLanes: [],
    evidenceSubjectIds: [600, 601],
  });
  assert.equal(excluded.size, 0);
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
