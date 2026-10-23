import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { calculateAssignmentWeightedGrade } from "./assignmentWeightedGrade.js";

const students = { Daniel: 189, Faith: 191 };
const assignment = (id, maxPoints, weight, danielScore, faithScore) => ({
  id,
  maxPoints,
  weight,
  scores: [
    ...(danielScore === undefined ? [] : [{ studentId: students.Daniel, score: danielScore }]),
    ...(faithScore === undefined ? [] : [{ studentId: students.Faith, score: faithScore }]),
  ],
});

const creativeArtsAssignments = [
  assignment(201, 50, 1, 40, 40),
  assignment(202, 50, 1, 38, 39),
  assignment(203, 50, 1, 38, 39),
  assignment(225, 20, 0, 20, 20),
  assignment(226, 10, 0, 10, 10),
  assignment(227, 10, 0, 10, 10),
  assignment(228, 10, 0, 10, 10),
  assignment(229, 10, 0, 10, 10),
];

test("Grade 8 Creative Arts uses the report-policy result for Daniel and Faith", () => {
  assert.equal(Math.round(calculateAssignmentWeightedGrade(students.Daniel, creativeArtsAssignments)), 77);
  assert.equal(Math.round(calculateAssignmentWeightedGrade(students.Faith, creativeArtsAssignments)), 79);
});

test("zero-weight assignments are excluded, including when their score is missing", () => {
  assert.equal(calculateAssignmentWeightedGrade(1, [
    assignment(1, 100, 1, undefined, undefined),
    { id: 2, maxPoints: 100, weight: 0, scores: [] },
  ]), null);
  assert.equal(calculateAssignmentWeightedGrade(1, [
    { id: 1, maxPoints: 100, weight: 1, scores: [{ studentId: 1, score: 80 }] },
    { id: 2, maxPoints: 0, weight: 0, scores: [] },
  ]), 80);
});

test("approved formula pools earned and possible points while zero weight still excludes", () => {
  assert.equal(calculateAssignmentWeightedGrade(1, [
    { id: 1, maxPoints: 20, weight: 1, scores: [{ studentId: 1, score: 18 }] },
    { id: 2, maxPoints: 50, weight: 1, scores: [{ studentId: 1, score: 30 }] },
    { id: 3, maxPoints: 10, weight: 1, scores: [{ studentId: 1, score: 8 }] },
  ]), 70);
  assert.equal(calculateAssignmentWeightedGrade(1, [
    { id: 1, maxPoints: 100, weight: 1, scores: [{ studentId: 1, score: 50 }] },
    { id: 2, maxPoints: 100, weight: 3, scores: [{ studentId: 1, score: 100 }] },
  ]), 75);
  assert.equal(calculateAssignmentWeightedGrade(1, [{ id: 1, maxPoints: 100, weight: 0, scores: [] }]), null);
  assert.equal(calculateAssignmentWeightedGrade(1, [{ id: 1, maxPoints: 100, weight: -1, scores: [{ studentId: 1, score: 80 }] }]), null);
  assert.equal(calculateAssignmentWeightedGrade(1, [{ id: 1, maxPoints: 100, weight: Number.NaN, scores: [{ studentId: 1, score: 80 }] }]), null);
});

test("visible gradebook and CSV use the same assignment-weight result and render zero faithfully", () => {
  const source = fs.readFileSync(new URL("../pages/teacher/GradebookDetail.jsx", import.meta.url), "utf8");
  assert.equal(source.match(/const final = getStudentAverage\(student\)/g)?.length, 2);
  assert.doesNotMatch(source, /const final = getFinalGrade\(student\)/);
  assert.match(source, /value=\{a\.weight \?\? 1\}/);
});
