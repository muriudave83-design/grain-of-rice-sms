import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import {
  CombinedTeachingGroupError,
  COMBINED_PUBLISHED_CONFIRMATION,
  assertNotCombinedChild,
  createCombinedAssignment,
  createTeachingGroup,
  deleteCombinedAssignment,
  getCombinedRoster,
  listTeacherGroups,
  previewCombinedAssignmentDelete,
  replaceTeachingGroupMember,
  reorderCombinedAssignments,
  saveCombinedScore,
  setCombinedAssignmentLock,
  setTeachingGroupActive,
  updateCombinedAssignment,
} from "./combinedTeachingGroup.service";

const url = process.env.COMBINED_GROUP_TEST_DATABASE_URL;
const parsed = url ? new URL(url) : null;
const isolated = Boolean(parsed && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname) && parsed.pathname.includes("combined_group_test"));

test("combined service orchestrates class-specific records safely", { skip: !isolated }, async () => {
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    const [class8, class9] = await Promise.all([db.class.create({ data: { name: "Service Grade 8" } }), db.class.create({ data: { name: "Service Grade 9" } })]);
    const [subject8, subject9] = await Promise.all([db.subject.create({ data: { name: "Service Kiswahili 8" } }), db.subject.create({ data: { name: "Service Kiswahili 9" } })]);
    const [lane8, lane9] = await Promise.all([db.classSubject.create({ data: { classId: class8.id, subjectId: subject8.id } }), db.classSubject.create({ data: { classId: class9.id, subjectId: subject9.id } })]);
    const [owner, replacement, outsider] = await Promise.all([
      db.user.create({ data: { name: "Service Owner", email: "service-owner@example.invalid", password: "x", role: "TEACHER" } }),
      db.user.create({ data: { name: "Service Replacement", email: "service-replacement@example.invalid", password: "x", role: "TEACHER" } }),
      db.user.create({ data: { name: "Service Outsider", email: "service-outsider@example.invalid", password: "x", role: "TEACHER" } }),
    ]);
    const [ts8, ts9, replacementTs8] = await Promise.all([
      db.teacherSubject.create({ data: { teacherId: owner.id, classId: class8.id, subjectId: subject8.id } }),
      db.teacherSubject.create({ data: { teacherId: owner.id, classId: class9.id, subjectId: subject9.id } }),
      db.teacherSubject.create({ data: { teacherId: replacement.id, classId: class8.id, subjectId: subject8.id } }),
    ]);
    const startDate = new Date("2026-08-01T00:00:00Z"); const endDate = new Date("2026-12-01T00:00:00Z");
    const [term8, term9] = await Promise.all([
      db.term.create({ data: { name: "Term 3", academicYear: "2026", startDate, endDate, classId: class8.id } }),
      db.term.create({ data: { name: "Term 3", academicYear: "2026", startDate, endDate, classId: class9.id } }),
    ]);
    const [student8, student9] = await Promise.all([
      db.student.create({ data: { firstName: "Eight", lastName: "Student", admissionNo: "SVC8", classId: class8.id } }),
      db.student.create({ data: { firstName: "Nine", lastName: "Student", admissionNo: "SVC9", classId: class9.id } }),
    ]);

    await assert.rejects(() => createTeachingGroup(db, { name: "Invalid", periodName: "Term 3", academicYear: "2026", lanes: [{ classSubjectId: lane8.id, assignmentOwnerTeacherSubjectId: ts9.id, termId: term8.id }, { classSubjectId: lane9.id, assignmentOwnerTeacherSubjectId: ts9.id, termId: term9.id }] }), /active matching teacher assignment/);
    const group: any = await createTeachingGroup(db, { name: "Service Grade 8-9 Kiswahili", periodName: "Term 3", academicYear: "2026", lanes: [{ classSubjectId: lane8.id, assignmentOwnerTeacherSubjectId: ts8.id, termId: term8.id }, { classSubjectId: lane9.id, assignmentOwnerTeacherSubjectId: ts9.id, termId: term9.id }] });
    assert.equal(group.classes.length, 2);
    assert.equal((await listTeacherGroups(db, owner.id)).length, 1);
    assert.equal((await listTeacherGroups(db, outsider.id)).length, 0);
    await assert.rejects(() => getCombinedRoster(db, group.id, outsider.id), (error: any) => error instanceof CombinedTeachingGroupError && error.status === 403);
    const periodId = group.periods[0].id;
    const first: any = await createCombinedAssignment(db, group.id, owner.id, { periodId, requestKey: "service-request", title: "Composition 1", maxPoints: 50, weight: 2 });
    const retry: any = await createCombinedAssignment(db, group.id, owner.id, { periodId, requestKey: "service-request", title: "Composition 1", maxPoints: 50, weight: 2 });
    assert.equal(first.id, retry.id); assert.equal(first.children.length, 2);
    assert.deepEqual(first.children.map((child: any) => child.assignment.termId).sort(), [term8.id, term9.id].sort());
    await saveCombinedScore(db, group.id, owner.id, { combinedAssignmentId: first.id, studentId: student8.id, score: 0 });
    await saveCombinedScore(db, group.id, owner.id, { combinedAssignmentId: first.id, studentId: student9.id, score: 45 });
    const child8 = first.children.find((child: any) => child.assignment.termId === term8.id);
    const child9 = first.children.find((child: any) => child.assignment.termId === term9.id);
    await assert.rejects(() => assertNotCombinedChild(db, [child8.assignmentId]), /combined teaching group/);
    assert.equal((await db.score.findUnique({ where: { studentId_assignmentId: { studentId: student8.id, assignmentId: child8.assignmentId } } }))?.score, 0);
    assert.equal(await db.score.count({ where: { studentId: student8.id, assignmentId: child9.assignmentId } }), 0);
    await assert.rejects(() => saveCombinedScore(db, group.id, owner.id, { combinedAssignmentId: first.id, assignmentId: child9.assignmentId, studentId: student8.id, score: 20 }), /injection rejected/);
    await updateCombinedAssignment(db, group.id, owner.id, first.id, { title: "Composition renamed" });
    assert.equal(await db.assignment.count({ where: { id: { in: first.children.map((child: any) => child.assignmentId) }, title: "Composition renamed" } }), 2);
    const second: any = await createCombinedAssignment(db, group.id, owner.id, { periodId, requestKey: "service-request-2", title: "Composition 2" });
    await reorderCombinedAssignments(db, group.id, owner.id, periodId, [{ id: second.id, position: 0 }, { id: first.id, position: 1 }]);
    assert.equal(await db.assignment.count({ where: { id: { in: first.children.map((child: any) => child.assignmentId) }, position: 1 } }), 2);
    await setCombinedAssignmentLock(db, group.id, owner.id, first.id, true);
    assert.equal(await db.assignment.count({ where: { id: { in: first.children.map((child: any) => child.assignmentId) }, isLocked: true } }), 2);
    await setCombinedAssignmentLock(db, group.id, owner.id, first.id, false);
    await Promise.all([
      db.grade.create({ data: { studentId: student8.id, subjectId: subject8.id, termId: term8.id, average: 0, total: 0 } }),
      db.grade.create({ data: { studentId: student9.id, subjectId: subject9.id, termId: term9.id, average: 0.9, total: 90 } }),
    ]);
    const deletion = await previewCombinedAssignmentDelete(db, group.id, owner.id, first.id);
    assert.equal(deletion.publishedGradeCount, 2);
    await deleteCombinedAssignment(db, group.id, owner.id, first.id, COMBINED_PUBLISHED_CONFIRMATION);
    assert.equal(await db.grade.count({ where: { id: { gt: 0 }, termId: { in: [term8.id, term9.id] } } }), 0);
    assert.equal(await db.assignment.count({ where: { id: { in: [child8.assignmentId, child9.assignmentId] } } }), 0);
    assert.ok((await db.combinedAssignment.findUnique({ where: { id: first.id } }))?.deletedAt);
    const lane8Group = group.classes.find((item: any) => item.classSubjectId === lane8.id);
    const secondLane8 = second.children.find((child: any) => child.teachingGroupClassId === lane8Group.id);
    await replaceTeachingGroupMember(db, group.id, lane8Group.id, ts8.id, replacementTs8.id, true);
    assert.equal(await db.assignment.count({ where: { id: secondLane8.assignmentId, teacherSubjectId: ts8.id } }), 1);
    assert.equal((await db.teachingGroupMember.findUnique({ where: { teachingGroupClassId_teacherSubjectId: { teachingGroupClassId: lane8Group.id, teacherSubjectId: ts8.id } } }))?.isActive, false);
    await setTeachingGroupActive(db, group.id, false);
    assert.equal((await db.teachingGroup.findUnique({ where: { id: group.id } }))?.isActive, false);
  } finally { await db.$disconnect(); }
});
