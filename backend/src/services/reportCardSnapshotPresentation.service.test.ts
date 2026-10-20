import assert from "node:assert/strict";
import test from "node:test";
import { presentReportCardSnapshot } from "./reportCardSnapshotPresentation.service";

test("legacy fraction averages render from stable percentage totals without mutating input", () => {
  const snapshot = {
    id: 1,
    total: 175,
    average: 0.875,
    subjects: [
      { subjectId: 1, total: 95, average: 0.95 },
      { subjectId: 2, total: 80, average: 0.8 },
    ],
  };
  const presented = presentReportCardSnapshot(snapshot);
  assert.deepEqual(presented.subjects.map((entry) => (entry as typeof entry & { finalScore: number }).finalScore), [95, 80]);
  assert.equal(presented.average, 87.5);
  assert.equal(presented.grade, "B");
  assert.equal(presented.gradeDescription, "Meeting Expectations");
  assert.equal(snapshot.average, 0.875);
  assert.deepEqual(snapshot.subjects.map((entry) => entry.average), [0.95, 0.8]);
});

test("a legitimate sub-one-percent total is not mistaken for a stored fraction", () => {
  const presented = presentReportCardSnapshot({
    total: 0.8,
    average: 0.008,
    subjects: [{ subjectId: 1, total: 0.8, average: 0.008 }],
  });
  assert.equal((presented.subjects[0] as typeof presented.subjects[0] & { finalScore: number }).finalScore, 0.8);
  assert.equal(presented.average, 0.8);
  assert.equal(presented.grade, "F");
});
