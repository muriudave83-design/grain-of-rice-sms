import { Prisma, PrismaClient, Role } from "@prisma/client";

type Client = Prisma.TransactionClient | PrismaClient;

export const studentDeleteConfirmation = (id: number) => `DELETE STUDENT ${id}`;
export const teacherDeleteConfirmation = (id: number) => `DELETE USER ${id}`;

export async function getStudentPermanentDeletePreview(client: Client, studentId: number) {
  const student = await client.student.findUnique({
    where: { id: studentId },
    select: {
      id: true, firstName: true, lastName: true, admissionNo: true, classId: true,
      isArchived: true, userId: true,
      class: { select: { id: true, name: true, isArchived: true } },
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });
  if (!student) throw { status: 404, message: "Student not found" };

  const sid = student.id;
  const [studentClassEnrollments, parentLinks, guardians, enrollments, scores,
    assessmentScores, grades, reportCards, reportEntries, reportComments, transcripts,
    transcriptEntries, attendanceEntries, discipline, fees, feePayments, invoices,
    sponsorships, parentContactLogs] = await Promise.all([
    client.studentClassEnrollment.count({ where: { studentId: sid } }),
    client.parentStudent.count({ where: { studentId: sid } }),
    client.guardian.count({ where: { studentId: sid } }),
    client.enrollment.count({ where: { studentId: sid } }),
    client.score.count({ where: { studentId: sid } }),
    client.assessmentScore.count({ where: { studentId: sid } }),
    client.grade.count({ where: { studentId: sid } }),
    client.reportCard.count({ where: { studentId: sid } }),
    client.reportCardSubjectEntry.count({ where: { reportCard: { studentId: sid } } }),
    client.reportComment.count({ where: { studentId: sid } }),
    client.transcript.count({ where: { studentId: sid } }),
    client.transcriptEntry.count({ where: { transcript: { studentId: sid } } }),
    client.attendanceEntry.count({ where: { studentId: sid } }),
    client.discipline.count({ where: { studentId: sid } }),
    client.fee.count({ where: { studentId: sid } }),
    client.feePayment.count({ where: { fee: { studentId: sid } } }),
    client.invoice.count({ where: { studentId: sid } }),
    client.sponsorship.count({ where: { studentId: sid } }),
    client.parentContactLog.count({ where: { studentId: sid } }),
  ]);

  let linkedUserOtherReferences = 0;
  if (student.userId) {
    const uid = student.userId;
    linkedUserOtherReferences = (await Promise.all([
      client.guardian.count({ where: { userId: uid } }),
      client.attendanceSession.count({ where: { teacherId: uid } }),
      client.discipline.count({ where: { recordedById: uid } }),
      client.invoice.count({ where: { createdById: uid } }),
      client.teacherSubject.count({ where: { teacherId: uid } }),
      client.subject.count({ where: { teacherId: uid } }),
      client.parent.count({ where: { userId: uid } }),
    ])).reduce((sum, count) => sum + count, 0);
  }
  const deleteLinkedUser = Boolean(
    student.userId && student.user?.role === Role.STUDENT && linkedUserOtherReferences === 0,
  );
  const blockers = student.userId && !deleteLinkedUser
    ? ["Linked User has a non-STUDENT role or references outside this Student"]
    : [];

  return {
    student,
    blockers,
    allowDelete: blockers.length === 0,
    willDelete: { studentClassEnrollments, parentLinks, guardians, enrollments, scores,
      assessmentScores, grades, reportCards, reportEntries, reportComments, transcripts,
      transcriptEntries, attendanceEntries, discipline, fees, feePayments, invoices,
      sponsorships, parentContactLogs, student: 1, linkedUser: deleteLinkedUser ? 1 : 0 },
    preserved: ["Class", "Attendance sessions", "Parents", "Users linked as guardians", "Subjects", "Terms", "ClassSubjects", "Sponsors"],
    confirmationPhrase: studentDeleteConfirmation(student.id),
  };
}

export async function permanentlyDeleteStudent(prisma: PrismaClient, studentId: number, confirmation: unknown) {
  return prisma.$transaction(async (tx) => {
    const preview = await getStudentPermanentDeletePreview(tx, studentId);
    if (confirmation !== preview.confirmationPhrase) throw { status: 400, message: `Type ${preview.confirmationPhrase} to confirm deletion` };
    if (!preview.allowDelete) throw { status: 409, message: "Student permanent deletion is blocked", preview };
    const userId = preview.student.userId;

    await tx.feePayment.deleteMany({ where: { fee: { studentId } } });
    await tx.reportCardSubjectEntry.deleteMany({ where: { reportCard: { studentId } } });
    await tx.transcriptEntry.deleteMany({ where: { transcript: { studentId } } });
    await tx.studentClassEnrollment.deleteMany({ where: { studentId } });
    await tx.parentStudent.deleteMany({ where: { studentId } });
    await tx.guardian.deleteMany({ where: { studentId } });
    await tx.enrollment.deleteMany({ where: { studentId } });
    await tx.score.deleteMany({ where: { studentId } });
    await tx.assessmentScore.deleteMany({ where: { studentId } });
    await tx.grade.deleteMany({ where: { studentId } });
    await tx.reportComment.deleteMany({ where: { studentId } });
    await tx.attendanceEntry.deleteMany({ where: { studentId } });
    await tx.discipline.deleteMany({ where: { studentId } });
    await tx.fee.deleteMany({ where: { studentId } });
    await tx.invoice.deleteMany({ where: { studentId } });
    await tx.sponsorship.deleteMany({ where: { studentId } });
    await tx.parentContactLog.deleteMany({ where: { studentId } });
    await tx.reportCard.deleteMany({ where: { studentId } });
    await tx.transcript.deleteMany({ where: { studentId } });
    await tx.student.delete({ where: { id: studentId } });
    if (preview.willDelete.linkedUser && userId) await tx.user.delete({ where: { id: userId } });
    return preview;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
}

export async function getTeacherPermanentDeletePreview(client: Client, userId: number, replacementAdminId: number) {
  const [user, replacementAdmin] = await Promise.all([
    client.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: true, isActive: true, isArchived: true } }),
    client.user.findFirst({ where: { id: replacementAdminId, role: Role.ADMIN }, select: { id: true, email: true } }),
  ]);
  if (!user) throw { status: 404, message: "User not found" };
  if (user.role !== Role.TEACHER) throw { status: 400, message: "Permanent User deletion is restricted to Teachers" };
  if (!replacementAdmin) throw { status: 409, message: "A valid Admin is required to preserve shared ownership records" };

  const [teacherSubjects, assignments, scores, reportComments, attendanceSessions,
    attendanceEntries, disciplineRecords, legacySubjects, auditLogs, guardianLinks,
    createdInvoices, parentProfiles, studentProfiles] = await Promise.all([
    client.teacherSubject.count({ where: { teacherId: userId } }),
    client.assignment.count({ where: { teacherSubject: { teacherId: userId } } }),
    client.score.count({ where: { assignment: { teacherSubject: { teacherId: userId } } } }),
    client.reportComment.count({ where: { teacherSubject: { teacherId: userId } } }),
    client.attendanceSession.count({ where: { teacherId: userId } }),
    client.attendanceEntry.count({ where: { session: { teacherId: userId } } }),
    client.discipline.count({ where: { recordedById: userId } }),
    client.subject.count({ where: { teacherId: userId } }),
    client.auditLog.count({ where: { actorUserId: String(userId) } }),
    client.guardian.count({ where: { userId } }),
    client.invoice.count({ where: { createdById: userId } }),
    client.parent.count({ where: { userId } }),
    client.student.count({ where: { userId } }),
  ]);
  const blockers = { guardianLinks, parentProfiles, studentProfiles };
  return {
    user,
    blockers,
    allowDelete: Object.values(blockers).every((count) => count === 0),
    willDelete: { scores, assignments, reportComments, teacherSubjects, auditLogs, user: 1 },
    willPreserveByReassignment: { attendanceSessions, attendanceEntries, disciplineRecords, createdInvoices, replacementAdminId },
    willPreserveByClearingLegacyOwner: { subjects: legacySubjects },
    preserved: ["Students", "Classes", "Subjects", "Terms", "ClassSubjects", "Attendance sessions and entries", "Discipline records", "Invoices"],
    confirmationPhrase: teacherDeleteConfirmation(user.id),
  };
}

export async function permanentlyDeleteTeacher(prisma: PrismaClient, userId: number, replacementAdminId: number, confirmation: unknown) {
  return prisma.$transaction(async (tx) => {
    const preview = await getTeacherPermanentDeletePreview(tx, userId, replacementAdminId);
    if (confirmation !== preview.confirmationPhrase) throw { status: 400, message: `Type ${preview.confirmationPhrase} to confirm deletion` };
    if (!preview.allowDelete) throw { status: 409, message: "Teacher permanent deletion is blocked by shared identity links", preview };

    await tx.attendanceSession.updateMany({ where: { teacherId: userId }, data: { teacherId: replacementAdminId } });
    await tx.discipline.updateMany({ where: { recordedById: userId }, data: { recordedById: replacementAdminId } });
    await tx.invoice.updateMany({ where: { createdById: userId }, data: { createdById: replacementAdminId } });
    await tx.subject.updateMany({ where: { teacherId: userId }, data: { teacherId: null } });
    await tx.auditLog.deleteMany({ where: { actorUserId: String(userId) } });
    await tx.score.deleteMany({ where: { assignment: { teacherSubject: { teacherId: userId } } } });
    await tx.assignment.deleteMany({ where: { teacherSubject: { teacherId: userId } } });
    await tx.reportComment.deleteMany({ where: { teacherSubject: { teacherId: userId } } });
    await tx.teacherSubject.deleteMany({ where: { teacherId: userId } });
    await tx.user.delete({ where: { id: userId } });
    return preview;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
}
