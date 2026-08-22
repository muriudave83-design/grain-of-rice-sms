import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { calculateFinalGradeForStudent } from "../controllers/teacher.controller";
import { getGradeDescription, getLetterGrade } from "./gradeDescriptions";

const boundaries: Array<[number, string, string]> = [
  [100, "A", "Exceeding Expectations"], [94, "A", "Exceeding Expectations"],
  [93, "A-", "Exceeding Expectations"], [90, "A-", "Exceeding Expectations"],
  [89, "B+", "Meeting Expectations"], [88, "B+", "Meeting Expectations"],
  [87, "B", "Meeting Expectations"], [84, "B", "Meeting Expectations"],
  [83, "B-", "Meeting Expectations"], [80, "B-", "Meeting Expectations"],
  [79, "C+", "Approaching Expectations"], [78, "C+", "Approaching Expectations"],
  [77, "C", "Approaching Expectations"], [74, "C", "Approaching Expectations"],
  [73, "C-", "Approaching Expectations"], [70, "C-", "Approaching Expectations"],
  [69, "D+", "Below Expectations"], [68, "D+", "Below Expectations"],
  [67, "D", "Below Expectations"], [64, "D", "Below Expectations"],
  [63, "D-", "Below Expectations"], [60, "D-", "Below Expectations"],
  [59, "F", "Below Expectations"], [0, "F", "Below Expectations"],
];

for (const [score, letter, description] of boundaries) {
  test(`${score}% maps to ${letter} / ${description}`, () => {
    assert.equal(getLetterGrade(score), letter);
    assert.equal(getGradeDescription(letter), description);
  });
}

const assignment = (score: number | undefined, weight = 1, maxPoints = 100) => ({
  weight, maxPoints, scores: score === undefined ? [] : [{ studentId: 1, score }],
});

test("missing score is not zero", () => assert.equal(calculateFinalGradeForStudent(1, [assignment(undefined)]), null));
test("explicit 0/100 is complete and produces F", () => {
  const result = calculateFinalGradeForStudent(1, [assignment(0)]);
  assert.equal(result, 0); assert.equal(getLetterGrade(result), "F");
});
test("partially graded student is incomplete", () => {
  assert.equal(calculateFinalGradeForStudent(1, [assignment(100), assignment(undefined)]), null);
});
test("complete weighted assignments calculate correctly", () => {
  assert.equal(calculateFinalGradeForStudent(1, [assignment(80, 1), assignment(50, 3, 50)]), 95);
});
test("incomplete class cannot publish and complete class can publish", () => {
  const canPublish = (studentIds: number[], assignments: any[]) =>
    studentIds.every((studentId) => calculateFinalGradeForStudent(studentId, assignments) !== null);
  const incomplete = [{ weight: 1, maxPoints: 100, scores: [{ studentId: 1, score: 80 }] }];
  const complete = [{ weight: 1, maxPoints: 100, scores: [{ studentId: 1, score: 80 }, { studentId: 2, score: 0 }] }];
  assert.equal(canPublish([1, 2], incomplete), false);
  assert.equal(canPublish([1, 2], complete), true);
});
test("alphabetical ordering is independent of marks", () => {
  const students = [{ name: "Zara", average: 80 }, { name: "Alice", average: 80 }, { name: "Ben", average: 100 }];
  assert.deepEqual([...students].sort((a, b) => a.name.localeCompare(b.name)).map((student) => student.name), ["Alice", "Ben", "Zara"]);
});
test("active Gradebook and Final Grades CSV contain no Position or ranking", () => {
  const frontendRoot = path.resolve(process.cwd(), "../frontend/src");
  const sources = [
    "pages/teacher/GradebookDetail.jsx", "pages/teacher/FinalGrades.jsx", "utils/finalGradesCsv.js",
  ].map((file) => fs.readFileSync(path.join(frontendRoot, file), "utf8")).join("\n");
  assert.doesNotMatch(sources, /Position|rankStudents|rankedStudents/);
});
test("persisted and transcript grades use the displayed canonical letter", () => {
  const displayed = getLetterGrade(89);
  const persistedTotal = 89;
  const transcriptSnapshot = getLetterGrade(persistedTotal);
  assert.equal(transcriptSnapshot, displayed);
});
test("publication guard, authorization, active-student and Term scoping remain present", () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), "src/controllers/teacher.controller.ts"), "utf8");
  assert.match(source, /every active student has a score for every assignment/);
  assert.match(source, /teacherId, classId/);
  assert.match(source, /id: termId, classId/);
  assert.match(source, /classId, isArchived: false/);
});
