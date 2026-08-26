import assert from "node:assert/strict";
import test from "node:test";
import { fitAssignmentMenuToViewport } from "./assignmentMenuPosition.js";

test("right-edge assignment menu opens left and remains within the viewport", () => {
  const result = fitAssignmentMenuToViewport({ clientX: 990, clientY: 100, viewportWidth: 1000, viewportHeight: 700 });
  assert.equal(result.opensLeft, true);
  assert.ok(result.x >= 8 && result.x + 224 <= 992);
});

test("left-side assignment menu opens right and narrow screens remain clamped", () => {
  assert.equal(fitAssignmentMenuToViewport({ clientX: 20, clientY: 20, viewportWidth: 1000, viewportHeight: 700 }).opensLeft, false);
  const narrow = fitAssignmentMenuToViewport({ clientX: 300, clientY: 600, viewportWidth: 320, viewportHeight: 640, menuWidth: 280 });
  assert.ok(narrow.x >= 8 && narrow.x + 280 <= 312);
  assert.ok(narrow.y >= 8 && narrow.y + 160 <= 632);
});
