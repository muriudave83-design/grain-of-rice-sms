import assert from "node:assert/strict";
import test from "node:test";
import { getAssignableClassSubjects, getSearchableActiveTeachers } from "./adminTeacherSubjectOptions.js";

const configured = [
  { id: 1, subject: { id: 10, name: "Mathematics", isArchived: false } },
  { id: 2, subject: { id: 11, name: "English", isArchived: false } },
];

test("all configured active ClassSubjects remain selectable", () => {
  assert.deepEqual(getAssignableClassSubjects(configured), configured);
});

test("TeacherSubject history from any teacher does not filter class options", () => {
  const teacherSubjects = [
    { teacherId: 20, subjectId: 10, isActive: true },
    { teacherId: 21, subjectId: 11, isActive: false },
  ];
  assert.equal(teacherSubjects.length, 2);
  assert.deepEqual(getAssignableClassSubjects(configured).map((entry) => entry.subject.id), [10, 11]);
});

test("archived and malformed subjects are excluded", () => {
  assert.deepEqual(getAssignableClassSubjects([
    ...configured,
    { id: 3, subject: { id: 12, name: "Archived", isArchived: true } },
    { id: 4, subject: null },
  ]), configured);
});

test("empty configuration remains explicit and invalid API shapes fail", () => {
  assert.deepEqual(getAssignableClassSubjects([]), []);
  assert.throws(() => getAssignableClassSubjects({ data: configured }), /Unexpected class-subject response/);
});

const teachers = [
  { id: 1, role: "TEACHER", name: "Joseph", email: "joseph@school.org", isActive: true, isArchived: false },
  { id: 2, role: "TEACHER", name: "Grace", email: "grace@school.org", isActive: true, isArchived: false },
  { id: 3, role: "TEACHER", name: "Archived", email: "old@school.org", isActive: false, isArchived: true },
  { id: 4, role: "ADMIN", name: "Admin", email: "admin@school.org", isActive: true, isArchived: false },
];

test("teacher search is case-insensitive by name and email", () => {
  assert.deepEqual(getSearchableActiveTeachers(teachers, "JOSEPH").map((teacher) => teacher.id), [1]);
  assert.deepEqual(getSearchableActiveTeachers(teachers, "GRACE@SCHOOL").map((teacher) => teacher.id), [2]);
});

test("inactive, archived and non-Teacher users are excluded", () => {
  assert.deepEqual(getSearchableActiveTeachers(teachers).map((teacher) => teacher.id), [1, 2]);
});
