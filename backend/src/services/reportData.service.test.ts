import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  assembleClassSubjectResults,
  getSubjectReportComment,
  indexReportComments,
  selectReportingTeacherSubject,
} from "./reportData.service";

const emptyComments = () => new Map<string, { comment: string; updatedAt: Date }>();

test("subject comments match both student and teacher-subject assignment", () => {
  const updatedAt = new Date("2026-01-01T00:00:00.000Z");
  const comments = indexReportComments([
    { studentId: 1, teacherSubjectId: 10, comment: "Student 1 English", updatedAt },
    { studentId: 1, teacherSubjectId: 20, comment: "Student 1 Mathematics", updatedAt },
    { studentId: 2, teacherSubjectId: 10, comment: "Student 2 English", updatedAt },
  ]);

  assert.equal(getSubjectReportComment(comments, 1, 10)?.comment, "Student 1 English");
  assert.equal(getSubjectReportComment(comments, 1, 20)?.comment, "Student 1 Mathematics");
  assert.equal(getSubjectReportComment(comments, 2, 10)?.comment, "Student 2 English");
  assert.equal(getSubjectReportComment(comments, 2, 20), null);
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
  assert.match(controller, /lockCommentWriteScope\(tx, Number\(teacherSubjectId\), Number\(termId\), Number\(studentId\)\)/);
  assert.match(controller, /validateLockedCommentScope/);
});

test("class-wide assembly includes every configured subject and prefers published grades", () => {
  const updatedAt = new Date("2026-01-01T00:00:00.000Z");
  const comments = indexReportComments([
    { studentId: 1, teacherSubjectId: 20, comment: "Pauline's comment", updatedAt },
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
  const base = { studentId: 1, requestingTeacherId: 100, grades: [], comments: new Map<string, { comment: string; updatedAt: Date }>() };
  assert.equal(assembleClassSubjectResults({ ...base, classSubjects: [makeSubject([{ studentId: 1, score: 0 }])] })[0].finalGrade, null);

  const completeZero = makeSubject([{ studentId: 1, score: 0 }]);
  completeZero.subject.teacherSubjects[0].assignments[1].scores = [{ studentId: 1, score: 0 }];
  assert.equal(assembleClassSubjectResults({ ...base, classSubjects: [completeZero] })[0].finalGrade, 0);
});

test("an active authoritative scope combines historical and current teacher assignments", () => {
  const result = assembleClassSubjectResults({
    studentId: 1,
    requestingTeacherId: 200,
    classSubjects: [{
      subjectId: 5,
      subject: { name: "Combined Mathematics", teacherSubjects: [
        { id: 10, teacherId: 100, isActive: false, assignments: [{ id: 40, gradeContributionStatus: "INCLUDED", weight: 1, maxPoints: 100, scores: [{ studentId: 1, score: 60 }] }] },
        { id: 20, teacherId: 200, isActive: true, assignments: [{ id: 41, gradeContributionStatus: "INCLUDED", weight: 1, maxPoints: 100, scores: [{ studentId: 1, score: 80 }] }] },
      ] },
    }],
    grades: [],
    comments: new Map(),
    contributionScopes: new Map([[5, { mode: "ACTIVE", revision: 1 }]]),
  });
  assert.equal(result[0].finalGrade, 70);
  assert.equal(result[0].completenessState, "COMPLETE");
});

test("ambiguous multi-owner history stays review-required instead of manufacturing a grade", () => {
  const result = assembleClassSubjectResults({
    studentId: 1,
    requestingTeacherId: 200,
    classSubjects: [{
      subjectId: 5,
      subject: { name: "Mathematics", teacherSubjects: [
        { id: 10, teacherId: 100, isActive: false, assignments: [{ id: 40, gradeContributionStatus: "UNREVIEWED", weight: 1, maxPoints: 100, scores: [{ studentId: 1, score: 60 }] }] },
        { id: 20, teacherId: 200, isActive: true, assignments: [{ id: 41, gradeContributionStatus: "UNREVIEWED", weight: 1, maxPoints: 100, scores: [{ studentId: 1, score: 80 }] }] },
      ] },
    }],
    grades: [],
    comments: new Map(),
    contributionScopes: new Map([[5, { mode: "REVIEWING", revision: 1 }]]),
  });
  assert.equal(result[0].finalGrade, null);
  assert.equal(result[0].completenessState, "REVIEW_REQUIRED");
});

test("combined-group display names cannot create report subjects", () => {
  const schema = fs.readFileSync(path.resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const groupModel = schema.match(/model TeachingGroup \{[\s\S]*?\n\}/)?.[0] ?? "";
  const laneModel = schema.match(/model TeachingGroupClass \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(groupModel, /name\s+String/);
  assert.match(laneModel, /classSubject\s+ClassSubject/);

  const result = assembleClassSubjectResults({
    studentId: 1,
    requestingTeacherId: 100,
    classSubjects: [{
      subjectId: 7,
      subject: {
        name: "Kiswahili",
        teacherSubjects: [{
          id: 70,
          teacherId: 100,
          isActive: true,
          assignments: [{ weight: 1, maxPoints: 100, scores: [{ studentId: 1, score: 83 }] }],
        }],
      },
    }],
    grades: [],
    comments: emptyComments(),
  });

  assert.deepEqual(result.map((entry) => entry.subjectName), ["Kiswahili"]);
  assert.equal(result.some((entry) => entry.subjectName === "Grade 8-9 Kiswahili"), false);
});

test("an empty active teacher record cannot hide a scored Music record", () => {
  const records = [
    { id: 150, teacherId: 200, isActive: true, assignments: [] },
    {
      id: 145,
      teacherId: 100,
      isActive: true,
      assignments: [{ weight: 1, maxPoints: 50, scores: [{ studentId: 1, score: 40 }] }],
    },
  ];
  assert.equal(selectReportingTeacherSubject(records)?.id, 145);

  const [music] = assembleClassSubjectResults({
    studentId: 1,
    requestingTeacherId: 200,
    classSubjects: [{ subjectId: 9, subject: { name: "Music", teacherSubjects: records } }],
    grades: [],
    comments: emptyComments(),
  });
  assert.equal(music.finalGrade, 80);
  assert.equal(music.completenessState, "COMPLETE");
});

test("complete weighted subjects use maximum points, preserve zero, and round once for reporting", () => {
  const [subject] = assembleClassSubjectResults({
    studentId: 1,
    requestingTeacherId: 100,
    classSubjects: [{
      subjectId: 12,
      subject: {
        name: "Science",
        teacherSubjects: [{
          id: 120,
          teacherId: 100,
          isActive: true,
          assignments: [
            { weight: 1, maxPoints: 20, scores: [{ studentId: 1, score: 0 }] },
            { weight: 2, maxPoints: 30, scores: [{ studentId: 1, score: 25 }] },
          ],
        }],
      },
    }],
    grades: [],
    comments: emptyComments(),
  });
  assert.equal(subject.finalGrade, 55.6);
  assert.equal(subject.resultSource, "assignment-draft");
});

test("a published grade remains authoritative even when current assignment inputs are incomplete", () => {
  const [subject] = assembleClassSubjectResults({
    studentId: 1,
    requestingTeacherId: 100,
    classSubjects: [{
      subjectId: 13,
      subject: {
        name: "Social Studies",
        teacherSubjects: [{
          id: 130,
          teacherId: 100,
          isActive: true,
          assignments: [{ id: 1300, gradeContributionStatus: "INCLUDED", weight: 1, maxPoints: 100, scores: [] }],
        }],
      },
    }],
    grades: [{ studentId: 1, subjectId: 13, total: 83, contributionRevision: 2 }],
    comments: emptyComments(),
    contributionScopes: new Map([[13, { mode: "ACTIVE", revision: 2 }]]),
  });
  assert.equal(subject.finalGrade, 83);
  assert.equal(subject.completenessState, "PUBLISHED");
  assert.equal(subject.needsRevalidation, false);
});
