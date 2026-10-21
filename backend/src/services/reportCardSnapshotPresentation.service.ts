import { getGradeDescription, getLetterGrade } from "../utils/gradeDescriptions";
import {
  filterExcludedReportSubjects,
  loadExcludedCombinedLabelSubjectIds,
} from "./officialReportSubjects.service";

export function presentReportCardSnapshot<T extends {
  total: number;
  average: number;
  subjects: Array<{ total: number; average: number; [key: string]: unknown }>;
  [key: string]: unknown;
}>(reportCard: T) {
  const subjects = reportCard.subjects.map((entry) => {
    // `total` has always represented the percentage in published Grade rows.
    // Older snapshots sometimes stored the fraction in `average`, so total is
    // the stable source for display without mutating the historical snapshot.
    const percentage = Number(entry.total);
    const grade = getLetterGrade(percentage);
    return {
      ...entry,
      finalScore: percentage,
      average: percentage,
      grade,
      gradeDescription: getGradeDescription(grade),
    };
  });
  const totalScore = subjects.reduce((sum, subject) => sum + subject.finalScore, 0);
  const average = subjects.length ? totalScore / subjects.length : null;
  const grade = getLetterGrade(average);
  return {
    ...reportCard,
    subjects,
    totalScore,
    total: totalScore,
    average,
    grade,
    gradeDescription: getGradeDescription(grade),
  };
}

export async function presentOfficialReportCardSnapshot<T extends {
  classId: number;
  termId: number;
  total: number;
  average: number;
  subjects: Array<{ subjectId: number; total: number; average: number; [key: string]: unknown }>;
  [key: string]: unknown;
}>(client: any, reportCard: T) {
  const excludedSubjectIds = await loadExcludedCombinedLabelSubjectIds(client, {
    classId: reportCard.classId,
    termId: reportCard.termId,
  });
  return presentReportCardSnapshot({
    ...reportCard,
    subjects: filterExcludedReportSubjects(reportCard.subjects, excludedSubjectIds),
  });
}
