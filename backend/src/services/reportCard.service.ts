import { Prisma, ReportCardStatus } from "@prisma/client";
import { prisma } from "../prisma/client";
import { countAbsentDays } from "./attendance/attendanceDomain";
import {
  loadAuthoritativeReportResults,
  summarizeCompleteReport,
} from "./authoritativeReport.service";

type GenerateReportCardsInput = {
  classId: number;
  termId: number;
};

export async function generateReportCardsForClass({
  classId,
  termId,
}: GenerateReportCardsInput) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
    const term = await tx.term.findFirst({
      where: { id: termId, classId },
      select: { id: true, startDate: true, endDate: true },
    });
    if (!term) throw new Error("Term does not belong to this class");

    const students = await tx.student.findMany({
      where: { classId, isArchived: false },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    const studentIds = students.map((student) => student.id);
    if (studentIds.length === 0) {
      return { generated: 0, preservedPublished: 0, incomplete: [] };
    }

    const { resultsByStudent } = await loadAuthoritativeReportResults(tx, {
      classId,
      termId,
      studentIds,
    });

    let generated = 0;
    let preservedPublished = 0;
    const incomplete: Array<{ studentId: number; subjectIds: number[] }> = [];

    for (const student of students) {
      const existing = await tx.reportCard.findUnique({
        where: { studentId_termId: { studentId: student.id, termId } },
        select: { id: true, status: true },
      });
      if (existing?.status === ReportCardStatus.PUBLISHED) {
        preservedPublished += 1;
        continue;
      }

      const subjects = resultsByStudent.get(student.id) ?? [];
      const summary = summarizeCompleteReport(subjects);
      if (!summary.isComplete || summary.total === null || summary.average === null) {
        incomplete.push({
          studentId: student.id,
          subjectIds: subjects
            .filter((subject) => subject.finalGrade === null)
            .map((subject) => subject.subjectId),
        });
        continue;
      }

      const attendanceRecords = await tx.attendanceEntry.findMany({
        where: {
          studentId: student.id,
          session: { date: { gte: term.startDate, lte: term.endDate } },
        },
        select: {
          period: true,
          status: true,
          session: { select: { date: true } },
        },
      });
      const attendanceAbsent = countAbsentDays(
        attendanceRecords.map((entry) => ({
          period: entry.period,
          status: entry.status,
          date: entry.session.date,
        })),
      );

      const reportCard = await tx.reportCard.upsert({
        where: { studentId_termId: { studentId: student.id, termId } },
        update: {
          classId,
          total: summary.total,
          average: summary.average,
          attendanceAbsent,
          status: ReportCardStatus.GENERATED,
        },
        create: {
          studentId: student.id,
          classId,
          termId,
          total: summary.total,
          average: summary.average,
          attendanceAbsent,
          status: ReportCardStatus.GENERATED,
        },
      });

      await tx.reportCardSubjectEntry.deleteMany({ where: { reportCardId: reportCard.id } });
      await tx.reportCardSubjectEntry.createMany({
        data: subjects.map((subject) => ({
          reportCardId: reportCard.id,
          subjectId: subject.subjectId,
          total: subject.finalGrade,
          average: subject.finalGrade,
        })),
      });
      generated += 1;
    }

        return { generated, preservedPublished, incomplete };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const serializationConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!serializationConflict || attempt === 3) throw error;
    }
  }
  throw new Error("Report-card generation conflicted with another update");
}
