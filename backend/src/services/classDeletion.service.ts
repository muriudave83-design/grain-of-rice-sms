import { Prisma, PrismaClient } from "@prisma/client";

type Client = Prisma.TransactionClient | PrismaClient;

export const CLASS_DELETE_PRESERVED = [
  "Users and credentials", "Students", "Parents and guardians", "Teachers and attendance officers",
  "Sponsors", "Subjects", "Fees, payments, invoices and sponsorships",
] as const;

export const classDeleteConfirmation = (name: string) => `DELETE ${name.toUpperCase()}`;

export async function getClassDeletePreview(client: Client, classId: number) {
  const schoolClass = await client.class.findUnique({ where: { id: classId }, select: { id: true, name: true, isArchived: true } });
  if (!schoolClass) throw { status: 404, message: "Class not found" };

  const [activeStudents, archivedStudents, activeTeacherAssignments, inactiveTeacherAssignments, historicalTeacherAssignments,
    historicalAssignments, historicalScores, historicalReportComments, classSubjects, terms,
    assessments, assessmentScores, grades, reportCards, reportEntries, transcripts, transcriptEntries,
    attendanceSessions, attendanceEntries, discipline, enrollments, fees, feePayments, invoices,
    sponsorships, guardians, parentLinks] = await Promise.all([
    client.student.count({ where: { classId, isArchived: false } }),
    client.student.count({ where: { classId, isArchived: true } }),
    client.teacherSubject.count({ where: { classId, isActive: true } }),
    client.teacherSubject.count({ where: { classId, isActive: false } }),
    client.teacherSubject.count({ where: { classId, isActive: false, OR: [
      { assignments: { some: {} } }, { reportComments: { some: {} } },
    ] } }),
    client.assignment.count({ where: { teacherSubject: { classId } } }),
    client.score.count({ where: { assignment: { teacherSubject: { classId } } } }),
    client.reportComment.count({ where: { teacherSubject: { classId } } }),
    client.classSubject.count({ where: { classId } }),
    client.term.count({ where: { classId } }),
    client.assessment.count({ where: { classId } }),
    client.assessmentScore.count({ where: { assessment: { classId } } }),
    client.grade.count({ where: { term: { classId } } }),
    client.reportCard.count({ where: { classId } }),
    client.reportCardSubjectEntry.count({ where: { reportCard: { classId } } }),
    client.transcript.count({ where: { classId } }),
    client.transcriptEntry.count({ where: { transcript: { classId } } }),
    client.attendanceSession.count({ where: { classId } }),
    client.attendanceEntry.count({ where: { session: { classId } } }),
    client.discipline.count({ where: { student: { classId } } }),
    client.enrollment.count({ where: { student: { classId } } }),
    client.fee.count({ where: { student: { classId } } }),
    client.feePayment.count({ where: { fee: { student: { classId } } } }),
    client.invoice.count({ where: { student: { classId } } }),
    client.sponsorship.count({ where: { student: { classId } } }),
    client.guardian.count({ where: { student: { classId } } }),
    client.parentStudent.count({ where: { student: { classId } } }),
  ]);

  const blockers = { activeStudents, archivedStudents, activeTeacherAssignments, historicalTeacherAssignments };
  const historyFreeInactiveTeacherAssignments = inactiveTeacherAssignments - historicalTeacherAssignments;
  const willDelete = { classSubjects, terms, assessments, assessmentScores, grades, reportCards, reportEntries,
    transcripts, transcriptEntries, attendanceSessions, attendanceEntries, discipline,
    historyFreeInactiveTeacherAssignments };
  const historicalOwnership = { assignments: historicalAssignments, scores: historicalScores, reportComments: historicalReportComments };
  const financialReferences = { fees, feePayments, invoices, sponsorships };
  const studentMasterReferences = { enrollments, guardians, parentLinks };
  return {
    class: schoolClass,
    blockers,
    historicalOwnership,
    financialReferences,
    studentMasterReferences,
    willDelete,
    preserved: CLASS_DELETE_PRESERVED,
    allowDelete: Object.values(blockers).every((count) => count === 0),
    confirmationPhrase: classDeleteConfirmation(schoolClass.name),
  };
}

export async function deleteClassWithData(prisma: PrismaClient, classId: number, confirmation: unknown) {
  return prisma.$transaction(async (tx) => {
    const preview = await getClassDeletePreview(tx, classId);
    if (confirmation !== preview.confirmationPhrase) {
      throw { status: 400, message: `Type ${preview.confirmationPhrase} to confirm deletion` };
    }
    if (!preview.allowDelete) throw { status: 409, message: "Class cannot be deleted while students or teacher assignment history remain", preview };

    await tx.assessmentScore.deleteMany({ where: { assessment: { classId } } });
    await tx.reportCardSubjectEntry.deleteMany({ where: { reportCard: { classId } } });
    await tx.transcriptEntry.deleteMany({ where: { transcript: { classId } } });
    await tx.attendanceEntry.deleteMany({ where: { session: { classId } } });
    await tx.score.deleteMany({ where: { assignment: { term: { classId } } } });
    await tx.assignment.deleteMany({ where: { term: { classId } } });
    await tx.assessment.deleteMany({ where: { classId } });
    await tx.grade.deleteMany({ where: { term: { classId } } });
    await tx.reportCard.deleteMany({ where: { classId } });
    await tx.reportComment.deleteMany({ where: { term: { classId } } });
    await tx.transcript.deleteMany({ where: { classId } });
    await tx.attendanceSession.deleteMany({ where: { classId } });
    await tx.discipline.deleteMany({ where: { term: { classId } } });
    await tx.term.deleteMany({ where: { classId } });
    await tx.classSubject.deleteMany({ where: { classId } });
    await tx.teacherSubject.deleteMany({ where: {
      classId, isActive: false, assignments: { none: {} }, reportComments: { none: {} },
    } });
    await tx.class.delete({ where: { id: classId } });
    return preview;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
