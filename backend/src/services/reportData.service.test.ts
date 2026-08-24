import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  assembleClassSubjectResults,
  getSubjectReportComment,
  indexReportComments,
} from "./reportData.service";

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
  assert.match(controller, /prisma\.classSubject\.findMany\(\{\s*where: \{ classId \}/s);
  assert.match(controller, /teacherSubjectId: \{ in: teacherSubjectIds \}/);
  assert.match(controller, /prisma\.grade\.findMany\(/);
  assert.match(controller, /termId,/);
  assert.match(controller, /id: Number\(teacherSubjectId\),\s*teacherId: \(req as any\)\.user\.id,\s*isActive: true/s);
});

test("class-wide assembly includes every configured subject and prefers published grades", () => {
  const comments = indexReportComments([
    { studentId: 1, teacherSubjectId: 20, comment: "Pauline's comment" },
  ]);
  const subjects = [
    {
      subjectId: 1,
      subject: {
        name: "English",
        teacherSubjects: [{
          id: 10, teacherId: 100, isActive: true,
          assignments: [{ weight: 1, maxPoints: 100, scores: [{ studentId: 1, score: 55 }] }],
        }],
      },
    },
    {
      subjectId: 2,
      subject: {
        name: "Mathematics",
        teacherSubjects: [{
          id: 20, teacherId: 200, isActive: true,
          assignments: [{ weight: 1, maxPoints: 100, scores: [{ studentId: 1, score: 70 }] }],
        }],
      },
    },
    { subjectId: 3, subject: { name: "Science", teacherSubjects: [] } },
  ];

  const result = assembleClassSubjectResults({
    studentId: 1,
    requestingTeacherId: 100,
    classSubjects: subjects,
    grades: [{ studentId: 1, subjectId: 1, total: 84 }],
    comments,
  });

  assert.deepEqual(result.map((entry) => entry.subjectName), ["English", "Mathematics", "Science"]);
  assert.equal(result[0].finalGrade, 84);
  assert.equal(result[0].resultSource, "published-grade");
  assert.equal(result[0].canEditComment, true);
  assert.equal(result[1].finalGrade, 70);
  assert.equal(result[1].comment, "Pauline's comment");
  assert.equal(result[1].canEditComment, false);
  assert.equal(result[2].finalGrade, null);
});

test("missing scores are incomplete while a genuine zero remains zero", () => {
  const makeSubject = (scores: Array<{ studentId: number; score: number }>) => ({
    subjectId: 1,
    subject: {
      name: "Mathematics",
      teacherSubjects: [{
        id: 10, teacherId: 100, isActive: true,
        assignments: [
          { weight: 1, maxPoints: 100, scores },
          { weight: 1, maxPoints: 100, scores: [] },
        ],
      }],
    },
  });
  const base = { studentId: 1, requestingTeacherId: 100, grades: [], comments: new Map<string, string>() };
  assert.equal(assembleClassSubjectResults({ ...base, classSubjects: [makeSubject([{ studentId: 1, score: 0 }])] })[0].finalGrade, null);

  const completeZero = makeSubject([{ studentId: 1, score: 0 }]);
  completeZero.subject.teacherSubjects[0].assignments[1].scores = [{ studentId: 1, score: 0 }];
  assert.equal(assembleClassSubjectResults({ ...base, classSubjects: [completeZero] })[0].finalGrade, 0);
});
