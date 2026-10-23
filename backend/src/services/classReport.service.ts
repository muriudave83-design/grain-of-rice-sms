import { loadReportAttendance } from "./attendance/reportAttendance.service";
import { loadAuthoritativeReportResults } from "./authoritativeReport.service";

type ReportStudent = {
  id: number;
  firstName: string;
  lastName: string;
  admissionNo: string;
};

export function assembleClassReports(
  students: ReportStudent[],
  resultsByStudent: Map<number, any[]>,
  attendanceByStudent: Map<number, any>,
) {
  return students.map((student) => {
    const subjects = (resultsByStudent.get(student.id) ?? []).map((subject) => ({
      ...subject,
      letter: subject.grade,
      status: subject.finalGrade === null ? "incomplete" : "complete",
    }));
    const attendance = attendanceByStudent.get(student.id);

    return {
      studentId: student.id,
      name: `${student.firstName} ${student.lastName}`,
      admissionNo: student.admissionNo,
      subjects,
      present: attendance?.present ?? 0,
      absent: attendance?.absent ?? 0,
      late: attendance?.late ?? 0,
      attendanceRate: attendance?.attendanceRate ?? null,
      attendanceState: attendance?.state ?? "NO_DATA",
      attendanceDraftDays: attendance?.draftDays ?? 0,
      attendanceIncompleteDays: attendance?.incomplete ?? 0,
    };
  });
}

export async function loadClassReports(
  client: any,
  input: {
    classId: number;
    termId: number;
    termStartDate: Date;
    termEndDate: Date;
    requestingTeacherId?: number;
  },
) {
  const students: ReportStudent[] = await client.student.findMany({
    where: { classId: input.classId, isArchived: false },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      admissionNo: true,
    },
  });
  const studentIds = students.map((student) => student.id);
  const [{ resultsByStudent }, attendanceByStudent] = await Promise.all([
    loadAuthoritativeReportResults(client, {
      classId: input.classId,
      termId: input.termId,
      studentIds,
      requestingTeacherId: input.requestingTeacherId,
      includeComments: true,
    }),
    loadReportAttendance(client, {
      classId: input.classId,
      termId: input.termId,
      startDate: input.termStartDate,
      endDate: input.termEndDate,
      studentIds,
    }),
  ]);

  return assembleClassReports(students, resultsByStudent, attendanceByStudent);
}
