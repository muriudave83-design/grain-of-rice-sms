import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.COMBINED_GROUP_TEST_DATABASE_URL;
const parsed = databaseUrl ? new URL(databaseUrl) : null;
const isExplicitlyIsolated = Boolean(
  parsed &&
  ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname) &&
  parsed.pathname.slice(1).includes("combined_group_test") &&
  !parsed.hostname.includes("render.com"),
);

async function expectDatabaseRejection(operation: () => Promise<unknown>, pattern: RegExp) {
  await assert.rejects(operation, pattern);
}

test("combined teaching PostgreSQL constraints and triggers", { skip: !isExplicitlyIsolated }, async () => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    const grade8 = await prisma.class.create({ data: { name: "Grade 8" } });
    const grade9 = await prisma.class.create({ data: { name: "Grade 9" } });
    const kiswahili8 = await prisma.subject.create({ data: { name: "Grade 8 Kiswahili", code: "SWA8" } });
    const kiswahili9 = await prisma.subject.create({ data: { name: "Grade 9 Kiswahili", code: "SWA9" } });
    const wrongSubject = await prisma.subject.create({ data: { name: "Grade 8 Music", code: "MUS8" } });
    const lane8Subject = await prisma.classSubject.create({ data: { classId: grade8.id, subjectId: kiswahili8.id } });
    const lane9Subject = await prisma.classSubject.create({ data: { classId: grade9.id, subjectId: kiswahili9.id } });
    await prisma.classSubject.create({ data: { classId: grade8.id, subjectId: wrongSubject.id } });

    const rodgers = await prisma.user.create({
      data: { name: "Rodgers test", email: "rodgers-combined-test@example.invalid", password: "test", role: "TEACHER" },
    });
    const coTeacher = await prisma.user.create({
      data: { name: "Co-teacher test", email: "coteacher-combined-test@example.invalid", password: "test", role: "TEACHER" },
    });
    const ts8 = await prisma.teacherSubject.create({ data: { teacherId: rodgers.id, classId: grade8.id, subjectId: kiswahili8.id } });
    const ts9 = await prisma.teacherSubject.create({ data: { teacherId: rodgers.id, classId: grade9.id, subjectId: kiswahili9.id } });
    const ts8WrongSubject = await prisma.teacherSubject.create({ data: { teacherId: rodgers.id, classId: grade8.id, subjectId: wrongSubject.id } });
    const ts8CoTeacher = await prisma.teacherSubject.create({ data: { teacherId: coTeacher.id, classId: grade8.id, subjectId: kiswahili8.id } });

    const startDate = new Date("2026-08-26T00:00:00.000Z");
    const endDate = new Date("2026-10-23T00:00:00.000Z");
    const term8 = await prisma.term.create({ data: { name: "Term 3", academicYear: "2026", startDate, endDate, classId: grade8.id } });
    const term9 = await prisma.term.create({ data: { name: "Term 3", academicYear: "2026", startDate, endDate, classId: grade9.id } });
    const alternateTerm8 = await prisma.term.create({ data: { name: "Term 4", academicYear: "2026", startDate, endDate, classId: grade8.id } });

    const group = await prisma.teachingGroup.create({ data: { name: "Grade 8-9 Kiswahili" } });
    const otherGroup = await prisma.teachingGroup.create({ data: { name: "Other group" } });
    const lane8 = await prisma.teachingGroupClass.create({ data: { teachingGroupId: group.id, classSubjectId: lane8Subject.id } });
    const lane9 = await prisma.teachingGroupClass.create({ data: { teachingGroupId: group.id, classSubjectId: lane9Subject.id } });
    const otherLane = await prisma.teachingGroupClass.create({ data: { teachingGroupId: otherGroup.id, classSubjectId: lane8Subject.id } });

    await prisma.teachingGroupMember.create({
      data: { teachingGroupClassId: lane8.id, teacherSubjectId: ts8.id, isAssignmentOwner: true },
    });
    await prisma.teachingGroupMember.create({
      data: { teachingGroupClassId: lane9.id, teacherSubjectId: ts9.id, isAssignmentOwner: true },
    });

    await expectDatabaseRejection(
      () => prisma.teachingGroupMember.create({ data: { teachingGroupClassId: lane8.id, teacherSubjectId: ts9.id } }),
      /TeacherSubject must match its ClassSubject lane/,
    );
    await expectDatabaseRejection(
      () => prisma.teachingGroupMember.create({ data: { teachingGroupClassId: lane8.id, teacherSubjectId: ts8WrongSubject.id } }),
      /TeacherSubject must match its ClassSubject lane/,
    );
    await expectDatabaseRejection(
      () => prisma.teachingGroupMember.create({ data: { teachingGroupClassId: lane8.id, teacherSubjectId: ts8CoTeacher.id, isAssignmentOwner: true } }),
      /TeachingGroupMember_one_active_owner_idx|Unique constraint failed/,
    );
    await prisma.teachingGroupMember.create({
      data: { teachingGroupClassId: lane8.id, teacherSubjectId: ts8CoTeacher.id, isAssignmentOwner: false },
    });

    const period = await prisma.teachingGroupPeriod.create({
      data: { teachingGroupId: group.id, name: "Term 3", academicYear: "2026" },
    });
    const otherPeriod = await prisma.teachingGroupPeriod.create({
      data: { teachingGroupId: otherGroup.id, name: "Term 3", academicYear: "2026" },
    });
    await prisma.teachingGroupTerm.create({ data: { teachingGroupPeriodId: period.id, teachingGroupClassId: lane8.id, termId: term8.id } });
    await prisma.teachingGroupTerm.create({ data: { teachingGroupPeriodId: period.id, teachingGroupClassId: lane9.id, termId: term9.id } });
    await expectDatabaseRejection(
      () => prisma.teachingGroupTerm.create({ data: { teachingGroupPeriodId: otherPeriod.id, teachingGroupClassId: otherLane.id, termId: term9.id } }),
      /Term must belong to the lane Class/,
    );
    await expectDatabaseRejection(
      () => prisma.teachingGroupTerm.create({ data: { teachingGroupPeriodId: otherPeriod.id, teachingGroupClassId: lane8.id, termId: alternateTerm8.id } }),
      /period and lane must belong to the same TeachingGroup/,
    );

    const logical = await prisma.combinedAssignment.create({
      data: { teachingGroupPeriodId: period.id, createdById: rodgers.id, requestKey: "composition-1", title: "Composition 1" },
    });
    await expectDatabaseRejection(
      () => prisma.combinedAssignment.create({
        data: { teachingGroupPeriodId: period.id, createdById: rodgers.id, requestKey: "composition-1", title: "Duplicate" },
      }),
      /CombinedAssignment_period_request_key|Unique constraint failed/,
    );

    const assignment8 = await prisma.assignment.create({ data: { title: "Composition 1", teacherSubjectId: ts8.id, termId: term8.id } });
    const assignment9 = await prisma.assignment.create({ data: { title: "Composition 1", teacherSubjectId: ts9.id, termId: term9.id } });
    await prisma.combinedAssignmentChild.create({ data: { combinedAssignmentId: logical.id, teachingGroupClassId: lane8.id, assignmentId: assignment8.id } });
    await prisma.combinedAssignmentChild.create({ data: { combinedAssignmentId: logical.id, teachingGroupClassId: lane9.id, assignmentId: assignment9.id } });

    const wrongTermAssignment = await prisma.assignment.create({ data: { title: "Wrong term", teacherSubjectId: ts8.id, termId: term9.id } });
    const wrongTeacherAssignment = await prisma.assignment.create({ data: { title: "Wrong teacher subject", teacherSubjectId: ts9.id, termId: term8.id } });
    const invalidLogical = await prisma.combinedAssignment.create({
      data: { teachingGroupPeriodId: period.id, createdById: rodgers.id, requestKey: "invalid-children", title: "Invalid" },
    });
    await expectDatabaseRejection(
      () => prisma.combinedAssignmentChild.create({ data: { combinedAssignmentId: invalidLogical.id, teachingGroupClassId: lane8.id, assignmentId: wrongTermAssignment.id } }),
      /Assignment must use the mapped Term/,
    );
    await expectDatabaseRejection(
      () => prisma.combinedAssignmentChild.create({ data: { combinedAssignmentId: invalidLogical.id, teachingGroupClassId: lane8.id, assignmentId: wrongTeacherAssignment.id } }),
      /Assignment must use the active assignment-owner TeacherSubject/,
    );
    await expectDatabaseRejection(
      () => prisma.assignment.update({ where: { id: assignment8.id }, data: { termId: alternateTerm8.id } }),
      /Linked combined Assignment term and TeacherSubject cannot be changed directly/,
    );
    await expectDatabaseRejection(
      () => prisma.assignment.update({ where: { id: assignment8.id }, data: { teacherSubjectId: ts8CoTeacher.id } }),
      /Linked combined Assignment term and TeacherSubject cannot be changed directly/,
    );
    const mapping8 = await prisma.teachingGroupTerm.findUniqueOrThrow({
      where: { teachingGroupPeriodId_teachingGroupClassId: { teachingGroupPeriodId: period.id, teachingGroupClassId: lane8.id } },
    });
    await expectDatabaseRejection(
      () => prisma.teachingGroupTerm.update({ where: { id: mapping8.id }, data: { termId: alternateTerm8.id } }),
      /change would invalidate an existing Assignment child/,
    );

    await expectDatabaseRejection(
      () => prisma.teachingGroup.create({ data: { name: "Invalid active lifecycle", isActive: true, endedAt: new Date() } }),
      /TeachingGroup_lifecycle_check/,
    );
    await expectDatabaseRejection(
      () => prisma.teachingGroupClass.create({
        data: { teachingGroupId: otherGroup.id, classSubjectId: lane9Subject.id, isActive: true, endedAt: new Date() },
      }),
      /TeachingGroupClass_lifecycle_check/,
    );
    await expectDatabaseRejection(
      () => prisma.teachingGroupMember.create({
        data: { teachingGroupClassId: otherLane.id, teacherSubjectId: ts8.id, isActive: true, endedAt: new Date() },
      }),
      /TeachingGroupMember_lifecycle_check/,
    );
    await expectDatabaseRejection(
      () => prisma.$executeRawUnsafe(`UPDATE "TeachingGroup" SET "isActive" = false WHERE "id" = ${group.id}`),
      /TeachingGroup_lifecycle_check/,
    );
    await expectDatabaseRejection(
      () => prisma.$executeRawUnsafe(`UPDATE "TeachingGroupClass" SET "isActive" = false WHERE "id" = ${lane8.id}`),
      /TeachingGroupClass_lifecycle_check/,
    );
    await expectDatabaseRejection(
      () => prisma.$executeRawUnsafe(`UPDATE "TeachingGroupMember" SET "isActive" = false WHERE "teachingGroupClassId" = ${lane8.id} AND "teacherSubjectId" = ${ts8.id}`),
      /TeachingGroupMember_lifecycle_check/,
    );

    const student = await prisma.student.create({
      data: { firstName: "Isolated", lastName: "Student", admissionNo: "COMBINED-TEST-001", classId: grade8.id },
    });
    await prisma.score.create({ data: { studentId: student.id, assignmentId: assignment8.id, score: 80, maxPoints: 100 } });
    await prisma.grade.create({ data: { studentId: student.id, subjectId: kiswahili8.id, termId: term8.id, average: 80, total: 80 } });
    await prisma.reportCard.create({
      data: { studentId: student.id, classId: grade8.id, termId: term8.id, average: 80, total: 80, status: "GENERATED" },
    });
    await prisma.transcript.create({ data: { studentId: student.id, classId: grade8.id, termId: term8.id } });
    const canonicalCountsBeforeMetadataDelete = {
      scores: await prisma.score.count(),
      grades: await prisma.grade.count(),
      reportCards: await prisma.reportCard.count(),
      transcripts: await prisma.transcript.count(),
    };

    await prisma.combinedAssignmentChild.delete({
      where: { assignmentId: assignment8.id },
    });
    assert.ok(await prisma.assignment.findUnique({ where: { id: assignment8.id } }));
    await prisma.combinedAssignmentChild.create({ data: { combinedAssignmentId: logical.id, teachingGroupClassId: lane8.id, assignmentId: assignment8.id } });
    await prisma.combinedAssignment.delete({ where: { id: logical.id } });
    assert.equal(await prisma.combinedAssignmentChild.count({ where: { combinedAssignmentId: logical.id } }), 0);
    assert.ok(await prisma.assignment.findUnique({ where: { id: assignment8.id } }));
    assert.ok(await prisma.assignment.findUnique({ where: { id: assignment9.id } }));
    assert.deepEqual({
      scores: await prisma.score.count(),
      grades: await prisma.grade.count(),
      reportCards: await prisma.reportCard.count(),
      transcripts: await prisma.transcript.count(),
    }, canonicalCountsBeforeMetadataDelete);

    const cascadeLogical = await prisma.combinedAssignment.create({
      data: { teachingGroupPeriodId: period.id, createdById: rodgers.id, requestKey: "cascade-child", title: "Cascade child" },
    });
    const cascadeAssignment = await prisma.assignment.create({ data: { title: "Cascade child", teacherSubjectId: ts8.id, termId: term8.id } });
    await prisma.combinedAssignmentChild.create({ data: { combinedAssignmentId: cascadeLogical.id, teachingGroupClassId: lane8.id, assignmentId: cascadeAssignment.id } });
    await prisma.assignment.delete({ where: { id: cascadeAssignment.id } });
    assert.equal(await prisma.combinedAssignmentChild.count({ where: { assignmentId: cascadeAssignment.id } }), 0);

    for (const table of ["Assignment", "Score", "Grade", "ReportCard", "Transcript", "TeacherSubject", "ClassSubject", "Term"]) {
      const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
        `SELECT to_regclass('public."${table}"') IS NOT NULL AS "exists"`,
      );
      assert.equal(rows[0]?.exists, true, `${table} must remain present`);
    }
  } finally {
    await prisma.$disconnect();
  }
});
