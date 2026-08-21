import { Prisma, PrismaClient } from "@prisma/client";

type DeleteClient = Prisma.TransactionClient | PrismaClient;

export const TERM_MASTER_DATA_PRESERVED = [
  "Users",
  "Students",
  "Parents",
  "Parent-student relationships",
  "Classes",
  "Subjects",
  "Teacher assignments",
  "Class subject assignments",
] as const;

export function termDeleteConfirmation(name: string) {
  return `DELETE ${name.toUpperCase()}`;
}

export async function getTermDeletePreview(client: DeleteClient, termId: number) {
  const term = await client.term.findUnique({
    where: { id: termId },
    select: { id: true, name: true, academicYear: true, classId: true, class: { select: { name: true } } },
  });
  if (!term) throw { status: 404, message: "Term not found" };

  const [assignments, scores, assessments, assessmentScores, grades, reportCards,
    reportEntries, reportComments, transcripts, transcriptEntries, attendanceSessions,
    attendanceEntries, discipline, nullTermAttendance, nullTermReportComments,
    nullTermDiscipline] = await Promise.all([
    client.assignment.count({ where: { termId } }),
    client.score.count({ where: { assignment: { termId } } }),
    client.assessment.count({ where: { termId } }),
    client.assessmentScore.count({ where: { assessment: { termId } } }),
    client.grade.count({ where: { termId } }),
    client.reportCard.count({ where: { termId } }),
    client.reportCardSubjectEntry.count({ where: { reportCard: { termId } } }),
    client.reportComment.count({ where: { termId } }),
    client.transcript.count({ where: { termId } }),
    client.transcriptEntry.count({ where: { transcript: { termId } } }),
    client.attendanceSession.count({ where: { termId } }),
    client.attendanceEntry.count({ where: { session: { termId } } }),
    client.discipline.count({ where: { termId } }),
    client.attendanceSession.count({ where: { termId: null, classId: term.classId } }),
    client.reportComment.count({ where: { termId: null, teacherSubject: { classId: term.classId } } }),
    client.discipline.count({ where: { termId: null, student: { classId: term.classId } } }),
  ]);

  const willDelete = { assignments, scores, assessments, assessmentScores, grades,
    reportCards, reportEntries, reportComments, transcripts, transcriptEntries,
    attendanceSessions, attendanceEntries, discipline };
  return {
    term,
    confirmation: termDeleteConfirmation(term.name),
    willDelete,
    totalRelatedRecords: Object.values(willDelete).reduce((sum, count) => sum + count, 0),
    willPreserve: TERM_MASTER_DATA_PRESERVED,
    unresolvedNotOwned: { nullTermAttendance, nullTermReportComments, nullTermDiscipline },
    financialData: "Preserved: fees, payments, invoices and sponsorships are not term-scoped.",
  };
}

export async function deleteTermData(prisma: PrismaClient, termId: number, confirmation: unknown) {
  return prisma.$transaction(async (tx) => {
    const preview = await getTermDeletePreview(tx, termId);
    if (confirmation !== preview.confirmation) {
      throw { status: 400, message: `Type ${preview.confirmation} to confirm deletion` };
    }

    await tx.score.deleteMany({ where: { assignment: { termId } } });
    await tx.assessmentScore.deleteMany({ where: { assessment: { termId } } });
    await tx.reportCardSubjectEntry.deleteMany({ where: { reportCard: { termId } } });
    await tx.transcriptEntry.deleteMany({ where: { transcript: { termId } } });
    await tx.attendanceEntry.deleteMany({ where: { session: { termId } } });

    await tx.assignment.deleteMany({ where: { termId } });
    await tx.assessment.deleteMany({ where: { termId } });
    await tx.grade.deleteMany({ where: { termId } });
    await tx.reportCard.deleteMany({ where: { termId } });
    await tx.reportComment.deleteMany({ where: { termId } });
    await tx.transcript.deleteMany({ where: { termId } });
    await tx.attendanceSession.deleteMany({ where: { termId } });
    await tx.discipline.deleteMany({ where: { termId } });
    await tx.term.delete({ where: { id: termId } });

    return preview;
  });
}
