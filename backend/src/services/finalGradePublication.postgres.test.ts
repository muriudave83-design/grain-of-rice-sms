import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { FinalGradePublicationError, publishFinalGradesAtomically } from "./finalGradePublication.service";

const url = process.env.COMBINED_GROUP_TEST_DATABASE_URL;
const parsed = url ? new URL(url) : null;
const isolated = Boolean(
  parsed && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname) &&
  parsed.pathname.slice(1).includes("combined_group_test") && !/render|prod/i.test(parsed.href),
);

async function fixture(db: PrismaClient, label: string, activeScope = true) {
  const suffix = `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const klass = await db.class.create({ data: { name: suffix } });
  const subject = await db.subject.create({ data: { name: suffix, code: suffix.slice(-30) } });
  await db.classSubject.create({ data: { classId: klass.id, subjectId: subject.id } });
  const teacher = await db.user.create({ data: { name: suffix, email: `${suffix}@example.invalid`, password: "x", role: "TEACHER" } });
  const teacherSubject = await db.teacherSubject.create({ data: { teacherId: teacher.id, classId: klass.id, subjectId: subject.id } });
  const term = await db.term.create({ data: { name: suffix, academicYear: "2026", startDate: new Date("2026-01-01Z"), endDate: new Date("2026-12-31Z"), classId: klass.id } });
  const student = await db.student.create({ data: { firstName: "Atomic", lastName: "Student", admissionNo: suffix, classId: klass.id } });
  const assignment = await db.assignment.create({ data: { title: "Required", teacherSubjectId: teacherSubject.id, termId: term.id, maxPoints: 100, gradeContributionStatus: "INCLUDED" } });
  await db.score.create({ data: { studentId: student.id, assignmentId: assignment.id, score: 70, maxPoints: 100 } });
  const scope = activeScope ? await db.gradeContributionScope.create({ data: { classId: klass.id, subjectId: subject.id, termId: term.id, mode: "ACTIVE" } }) : null;
  return { klass, subject, teacher, teacherSubject, term, student, assignment, scope };
}

const publish = (db: PrismaClient, f: Awaited<ReturnType<typeof fixture>>) =>
  publishFinalGradesAtomically(db, { classId: f.klass.id, termId: f.term.id, teacherId: f.teacher.id });

test("real PostgreSQL migration and atomic publication behavior", { skip: !isolated }, async () => {
  const db = new PrismaClient({ datasourceUrl: url });
  const peer = new PrismaClient({ datasourceUrl: url });
  try {
    const legacy = await fixture(db, "legacy", false);
    const before = await db.score.findUniqueOrThrow({ where: { studentId_assignmentId: { studentId: legacy.student.id, assignmentId: legacy.assignment.id } } });
    assert.equal(legacy.assignment.gradeContributionStatus, "INCLUDED");
    await publish(db, legacy);
    const legacyGrade = await db.grade.findUniqueOrThrow({ where: { studentId_subjectId_termId: { studentId: legacy.student.id, subjectId: legacy.subject.id, termId: legacy.term.id } } });
    assert.equal(legacyGrade.total, 70);
    assert.equal(legacyGrade.contributionRevision, null);
    assert.equal((await db.score.findUniqueOrThrow({ where: { id: before.id } })).score, before.score);

    const reviewed = await fixture(db, "reviewed", true);
    await publish(db, reviewed);
    const reviewedGrade = await db.grade.findUniqueOrThrow({ where: { studentId_subjectId_termId: { studentId: reviewed.student.id, subjectId: reviewed.subject.id, termId: reviewed.term.id } } });
    assert.equal(reviewedGrade.total, 70);
    assert.equal(reviewedGrade.contributionRevision, reviewed.scope!.revision);
    assert.equal((await db.assignment.findUniqueOrThrow({ where: { id: reviewed.assignment.id } })).isLocked, true);

    const scoreRace = await fixture(db, "score-race", true);
    const publication = publish(db, scoreRace);
    const scoreChange = peer.score.update({
      where: { studentId_assignmentId: { studentId: scoreRace.student.id, assignmentId: scoreRace.assignment.id } },
      data: { score: 90 },
    });
    const [published, changed] = await Promise.allSettled([publication, scoreChange]);
    assert.equal(changed.status, "fulfilled");
    if (published.status === "fulfilled") {
      const grade = await db.grade.findUniqueOrThrow({ where: { studentId_subjectId_termId: { studentId: scoreRace.student.id, subjectId: scoreRace.subject.id, termId: scoreRace.term.id } } });
      assert.ok([70, 90].includes(grade.total));
    } else {
      assert.ok(published.reason instanceof FinalGradePublicationError || published.reason?.code === "P2034");
    }

    const assignmentRace = await fixture(db, "assignment-race", true);
    const [publicationResult, creationResult] = await Promise.allSettled([
      publish(db, assignmentRace),
      peer.$transaction(async (tx) => {
        await tx.assignment.create({ data: { title: "New required", teacherSubjectId: assignmentRace.teacherSubject.id, termId: assignmentRace.term.id, maxPoints: 100, gradeContributionStatus: "INCLUDED" } });
        await tx.gradeContributionScope.update({ where: { id: assignmentRace.scope!.id }, data: { mode: "REVIEWING", revision: { increment: 1 }, activatedAt: null } });
      }, { isolationLevel: "Serializable" }),
    ]);
    assert.equal(creationResult.status, "fulfilled");
    const afterCreationScope = await db.gradeContributionScope.findUniqueOrThrow({ where: { id: assignmentRace.scope!.id } });
    assert.equal(afterCreationScope.mode, "REVIEWING");
    if (publicationResult.status === "fulfilled") {
      const grade = await db.grade.findUniqueOrThrow({ where: { studentId_subjectId_termId: { studentId: assignmentRace.student.id, subjectId: assignmentRace.subject.id, termId: assignmentRace.term.id } } });
      assert.notEqual(grade.contributionRevision, afterCreationScope.revision);
    }

    const reviewRace = await fixture(db, "review-race", true);
    const [, reviewResult] = await Promise.allSettled([
      publish(db, reviewRace),
      peer.$transaction(async (tx) => {
        await tx.assignment.update({ where: { id: reviewRace.assignment.id }, data: { gradeContributionStatus: "EXCLUDED", gradeContributionReviewedAt: new Date() } });
        await tx.gradeContributionScope.update({ where: { id: reviewRace.scope!.id }, data: { mode: "REVIEWING", revision: { increment: 1 }, activatedAt: null } });
      }, { isolationLevel: "Serializable" }),
    ]);
    assert.equal(reviewResult.status, "fulfilled");
    assert.equal((await db.gradeContributionScope.findUniqueOrThrow({ where: { id: reviewRace.scope!.id } })).mode, "REVIEWING");

    const reassignmentRace = await fixture(db, "reassignment-race", true);
    const [, reassignment] = await Promise.allSettled([
      publish(db, reassignmentRace),
      peer.teacherSubject.update({ where: { id: reassignmentRace.teacherSubject.id }, data: { isActive: false } }),
    ]);
    assert.equal(reassignment.status, "fulfilled");
    assert.equal((await db.teacherSubject.findUniqueOrThrow({ where: { id: reassignmentRace.teacherSubject.id } })).isActive, false);

    const activationRace = await fixture(db, "activation-race", true);
    const [, activation] = await Promise.allSettled([
      publish(db, activationRace),
      peer.gradeContributionScope.update({ where: { id: activationRace.scope!.id }, data: { revision: { increment: 1 }, mode: "ACTIVE" } }),
    ]);
    assert.equal(activation.status, "fulfilled");

    const concurrent = await fixture(db, "concurrent-publication", true);
    const requests = await Promise.allSettled([publish(db, concurrent), publish(peer, concurrent)]);
    assert.ok(requests.some((result) => result.status === "fulfilled"));
    assert.equal(await db.grade.count({ where: { studentId: concurrent.student.id, subjectId: concurrent.subject.id, termId: concurrent.term.id } }), 1);
  } finally {
    await Promise.all([db.$disconnect(), peer.$disconnect()]);
  }
});
