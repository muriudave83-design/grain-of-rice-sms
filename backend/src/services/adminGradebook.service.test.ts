import assert from "node:assert/strict";
import test from "node:test";
import { activateContributionScope, bulkIncludeAssignmentContributions, getAdminGradebook, getAdminGradebookOptions, getContributionReview, getReportPrintingApprovalOverview, listAdminGradebookClasses, reviewAssignmentContribution } from "./adminGradebook.service";

test("class and option queries exclude archived structure but retain historical teacher assignments", async () => {
  const calls: any = {};
  const historical = { id: 91, subjectId: 5, teacherId: 7, isActive: false, teacher: { id: 7, name: "Former Teacher", isActive: false, isArchived: true }, subject: { id: 5, name: "Math", code: "MAT" } };
  const client = {
    class: {
      findMany: async (args: any) => { calls.classes = args; return [{ id: 3, name: "Grade 3" }]; },
      findFirst: async (args: any) => { calls.schoolClass = args; return { id: 3, name: "Grade 3" }; },
    },
    classSubject: { findMany: async (args: any) => { calls.subjects = args; return [{ subject: historical.subject }]; } },
    term: { findMany: async (args: any) => { calls.terms = args; return [{ id: 12, name: "Term 1" }]; } },
    teacherSubject: { findMany: async (args: any) => { calls.teacherSubjects = args; return [historical]; } },
  };

  assert.equal((await listAdminGradebookClasses(client)).length, 1);
  const options = await getAdminGradebookOptions(client, 3);
  assert.equal(options?.teacherSubjects[0].isActive, false);
  assert.deepEqual(calls.classes.where, { isArchived: false });
  assert.deepEqual(calls.schoolClass.where, { id: 3, isArchived: false });
  assert.equal(calls.subjects.where.subject.isArchived, false);
  assert.equal(calls.teacherSubjects.where.class.isArchived, false);
  assert.equal(calls.teacherSubjects.where.subject.isArchived, false);
  assert.equal("isActive" in calls.teacherSubjects.where, false);
});

test("review uses an atomic timestamp precondition and returns a scope to REVIEWING", async () => {
  const reviewedAt = new Date("2026-10-20T06:00:00.000Z");
  const calls: any = {};
  const tx = {
    assignment: {
      findUnique: async () => ({ id: 44, termId: 12, gradeContributionStatus: "INCLUDED", gradeContributionReviewedAt: reviewedAt, teacherSubject: { classId: 3, subjectId: 5 }, scores: [] }),
      updateMany: async (args: any) => { calls.cas = args; return { count: 1 }; },
      findUniqueOrThrow: async () => ({ id: 44, gradeContributionStatus: "EXCLUDED" }),
    },
    gradeContributionScope: { upsert: async (args: any) => { calls.scope = args; return { id: 8, revision: 3, mode: "REVIEWING" }; } },
    auditLog: { create: async () => ({}) },
  };
  const client = { $transaction: async (fn: any) => fn(tx) };
  await reviewAssignmentContribution(client, { assignmentId: 44, status: "EXCLUDED", note: "Duplicate", expectedReviewedAt: reviewedAt.toISOString(), actorUserId: 1 });
  assert.equal(calls.cas.where.gradeContributionReviewedAt, reviewedAt);
  assert.equal(calls.scope.update.mode, "REVIEWING");
  assert.equal(calls.scope.update.activatedAt, null);
});

test("a concurrent review loses the compare-and-set and returns 409", async () => {
  const reviewedAt = new Date("2026-10-20T06:00:00.000Z");
  const tx = {
    assignment: {
      findUnique: async () => ({ id: 44, termId: 12, gradeContributionStatus: "INCLUDED", gradeContributionReviewedAt: reviewedAt, teacherSubject: { classId: 3, subjectId: 5 }, scores: [] }),
      updateMany: async () => ({ count: 0 }),
    },
  };
  const client = { $transaction: async (fn: any) => fn(tx) };
  await assert.rejects(
    () => reviewAssignmentContribution(client, { assignmentId: 44, status: "EXCLUDED", note: "Duplicate", expectedReviewedAt: reviewedAt.toISOString(), actorUserId: 1 }),
    (error: any) => error.status === 409,
  );
});

test("exact TeacherSubject and Assignment IDs are used while archived students are excluded", async () => {
  const calls: any = {};
  const teacherSubject = { id: 91, teacherId: 7, subjectId: 5, classId: 3, isActive: false, teacher: { id: 7, name: "Former Teacher" }, subject: { id: 5, name: "Math" }, class: { id: 3, name: "Grade 3" } };
  const client = {
    teacherSubject: { findFirst: async (args: any) => { calls.teacherSubject = args; return teacherSubject; } },
    term: { findFirst: async (args: any) => { calls.term = args; return { id: 12, name: "Term 1" }; } },
    student: { findMany: async (args: any) => { calls.students = args; return [{ id: 20, firstName: "Active", lastName: "Student" }]; } },
    assignment: { findMany: async (args: any) => { calls.assignments = args; return [{ id: 44, teacherSubjectId: 91, title: "Quiz", maxPoints: 20, scores: [] }]; } },
  };

  const result = await getAdminGradebook(client, 91, 12);
  assert.equal(result?.teacherSubject.id, 91);
  assert.equal(result?.assignments[0].id, 44);
  assert.equal(calls.teacherSubject.where.id, 91);
  assert.deepEqual(calls.term.where, { id: 12, classId: 3 });
  assert.deepEqual(calls.assignments.where, { teacherSubjectId: 91, termId: 12 });
  assert.deepEqual(calls.students.where, { classId: 3, isArchived: false });
  assert.equal(calls.assignments.select.scores.where.student.isArchived, false);
  assert.equal(calls.assignments.select.scores.where.student.classId, 3);
});

test("subject-wide review exposes assignments from every teacher owner", async () => {
  const calls: any = {};
  const client = {
    gradeContributionScope: { findUnique: async (args: any) => { calls.scope = args; return { id: 4, mode: "REVIEWING" }; } },
    assignment: { findMany: async (args: any) => {
      calls.assignments = args;
      return [
        { id: 10, teacherSubjectId: 20, gradeContributionStatus: "UNREVIEWED", teacherSubject: { teacher: { id: 7, name: "Former" } }, _count: { scores: 4 } },
        { id: 11, teacherSubjectId: 21, gradeContributionStatus: "INCLUDED", teacherSubject: { teacher: { id: 8, name: "Current" } }, _count: { scores: 5 } },
      ];
    } },
  };
  const review = await getContributionReview(client, 3, 5, 12);
  assert.equal(review.assignments.length, 2);
  assert.equal(review.assignments[0].scoreCount, 4);
  assert.deepEqual(calls.assignments.where, { termId: 12, teacherSubject: { classId: 3, subjectId: 5 } });
});

test("activation is blocked before review and succeeds after every assignment is decided", async () => {
  let statuses = ["UNREVIEWED", "INCLUDED"];
  const tx = {
    assignment: { findMany: async () => statuses.map((gradeContributionStatus, id) => ({ id: id + 1, gradeContributionStatus })) },
    gradeContributionScope: { upsert: async (args: any) => ({ id: 9, revision: 2, ...args.update }) },
    auditLog: { create: async () => ({}) },
  };
  const client = { $transaction: async (fn: any) => fn(tx) };
  await assert.rejects(
    () => activateContributionScope(client, { classId: 3, subjectId: 5, termId: 12, actorUserId: 1 }),
    (error: any) => error.status === 409 && error.details.unreviewed[0] === 1,
  );
  statuses = ["EXCLUDED", "INCLUDED"];
  const activated = await activateContributionScope(client, { classId: 3, subjectId: 5, termId: 12, actorUserId: 1 });
  assert.equal(activated.mode, "ACTIVE");
});

test("school-wide overview retrieves pending assignments and uses report completeness for readiness", async () => {
  const assignment = { id: 44, title: "Exam", maxPoints: 100, weight: 1, termId: 12, gradeContributionStatus: "UNREVIEWED", gradeContributionNote: null, gradeContributionReviewedAt: null, teacherSubject: { classId: 3, subjectId: 5, class: { id: 3, name: "Grade 3" }, subject: { id: 5, name: "Math" }, teacher: { id: 7, name: "Teacher" } }, term: { id: 12, name: "Term 3", academicYear: "2026" }, _count: { scores: 1 } };
  const client: any = {
    assignment: { findMany: async (args: any) => args.select?._count ? [assignment] : [{ teacherSubject: { subjectId: 5 } }] },
    gradeContributionScope: { findMany: async (args: any) => args.select?.mode && !args.where ? [{ classId: 3, subjectId: 5, termId: 12, mode: "REVIEWING" }] : [{ subjectId: 5, mode: "REVIEWING", revision: 1 }] },
    student: { findMany: async () => [{ id: 20, classId: 3 }] },
    class: { findUnique: async () => ({ name: "Grade 3" }) },
    classSubject: { findMany: async (args: any) => args.include ? [{ subjectId: 5, subject: { name: "Math", teacherSubjects: [{ id: 9, teacherId: 7, isActive: true, assignments: [{ id: 44, weight: 1, maxPoints: 100, gradeContributionStatus: "UNREVIEWED", scores: [{ studentId: 20, score: 80 }] }] }] } }] : [{ id: 1, subjectId: 5, subject: { name: "Math" } }] },
    teachingGroupClass: { findMany: async () => [] },
    grade: { findMany: async (args: any) => args.distinct ? [] : [] },
    assessment: { findMany: async () => [] },
  };
  const overview = await getReportPrintingApprovalOverview(client);
  assert.equal(overview.totals.unreviewed, 1);
  assert.equal(overview.assignments[0].scoreCount, 1);
  assert.equal(overview.readiness[0].status, "ASSIGNMENT_REVIEW_PENDING");
});

test("bulk inclusion is atomic, audited, preserves marks and weights, and duplicate requests are safe", async () => {
  let rows: any[] = [
    { id: 1, maxPoints: 100, weight: 2, termId: 12, gradeContributionStatus: "UNREVIEWED", teacherSubject: { classId: 3, subjectId: 5 }, scores: [{ id: 9 }] },
    { id: 2, maxPoints: 50, weight: 1, termId: 12, gradeContributionStatus: "INCLUDED", teacherSubject: { classId: 3, subjectId: 5 }, scores: [{ id: 10 }] },
  ];
  const calls: any = { audits: [], updates: [] };
  const tx = {
    assignment: {
      findMany: async ({ where }: any) => rows.filter((row) => where.id.in.includes(row.id)),
      updateMany: async (args: any) => { calls.updates.push(args); rows = rows.map((row) => args.where.id.in.includes(row.id) ? { ...row, ...args.data } : row); return { count: args.where.id.in.length }; },
    },
    gradeContributionScope: { upsert: async () => ({}) },
    auditLog: { create: async ({ data }: any) => { calls.audits.push(data); return {}; } },
  };
  const client = { $transaction: async (fn: any) => fn(tx) };
  const first = await bulkIncludeAssignmentContributions(client, { assignmentIds: [1, 2, 1], actorUserId: 99 });
  assert.deepEqual(first, { selected: 2, updated: 1, alreadyIncluded: 1, requiresActivation: true });
  assert.equal(calls.updates[0].data.weight, undefined);
  assert.equal(calls.updates[0].data.scores, undefined);
  assert.equal(calls.audits[0].actorUserId, "99");
  assert.equal(calls.audits[0].metadata.method, "BULK_REPORT_PRINTING_APPROVAL");
  const duplicate = await bulkIncludeAssignmentContributions(client, { assignmentIds: [1, 2], actorUserId: 99 });
  assert.deepEqual(duplicate, { selected: 2, updated: 0, alreadyIncluded: 2, requiresActivation: false });
});

test("bulk inclusion rejects mixed unsafe selections without writing", async () => {
  let writes = 0;
  const tx = {
    assignment: { findMany: async () => [
      { id: 1, maxPoints: 100, termId: 12, gradeContributionStatus: "UNREVIEWED", teacherSubject: { classId: 3, subjectId: 5 }, scores: [{ id: 1 }] },
      { id: 2, maxPoints: 100, termId: 12, gradeContributionStatus: "EXCLUDED", teacherSubject: { classId: 3, subjectId: 5 }, scores: [{ id: 2 }] },
    ], updateMany: async () => { writes++; return { count: 2 }; } },
  };
  const client = { $transaction: async (fn: any) => fn(tx) };
  await assert.rejects(() => bulkIncludeAssignmentContributions(client, { assignmentIds: [1, 2], actorUserId: 99 }), (error: any) => error.status === 409);
  assert.equal(writes, 0);
});
