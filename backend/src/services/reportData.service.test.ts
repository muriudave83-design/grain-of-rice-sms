import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { getSubjectReportComment, indexReportComments } from "./reportData.service";

test("subject comments match both student and teacher-subject assignment", () => {
  const comments = indexReportComments([
    { studentId: 1, teacherSubjectId: 10, comment: "Student 1 English" },
    { studentId: 1, teacherSubjectId: 20, comment: "Student 1 Mathematics" },
    { studentId: 2, teacherSubjectId: 10, comment: "Student 2 English" },
  ]);

  assert.equal(getSubjectReportComment(comments, 1, 10), "Student 1 English");
  assert.equal(getSubjectReportComment(comments, 1, 20), "Student 1 Mathematics");
  assert.equal(getSubjectReportComment(comments, 2, 10), "Student 2 English");
  assert.equal(getSubjectReportComment(comments, 2, 20), "");
});

test("teacher report authorization and term-scoped comment query remain enforced", () => {
  const routes = fs.readFileSync(path.resolve(process.cwd(), "src/routes/teacher.routes.ts"), "utf8");
  const controller = fs.readFileSync(path.resolve(process.cwd(), "src/controllers/teacher.controller.ts"), "utf8");

  assert.match(routes, /router\.use\(authenticate, requireRole\(\["TEACHER"\]\)\)/);
  assert.match(controller, /where: \{ classId, teacherId, isActive: true, class: \{ isArchived: false \} \}/);
  assert.match(controller, /teacherSubjectId: \{ in: subjects\.map\(\(subject\) => subject\.id\) \}/);
  assert.match(controller, /termId,/);
  assert.match(controller, /id: Number\(teacherSubjectId\),\s*teacherId: \(req as any\)\.user\.id,\s*isActive: true/s);
});
