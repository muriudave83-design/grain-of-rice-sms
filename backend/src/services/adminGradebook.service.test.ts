import assert from "node:assert/strict";
import test from "node:test";
import { getAdminGradebook, getAdminGradebookOptions, listAdminGradebookClasses } from "./adminGradebook.service";

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
