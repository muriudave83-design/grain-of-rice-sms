type ClassSubjectIdentity = {
  id: number;
  subjectId: number;
  subject: { name: string };
};

type TeachingGroupLaneIdentity = {
  classSubjectId: number;
  classSubject: { subjectId: number };
  teachingGroup: { name: string };
};

export function normalizeReportSubjectName(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleUpperCase("en")
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function findUnbackedCombinedLabelSubjectIds(input: {
  classSubjects: ClassSubjectIdentity[];
  groupLanes: TeachingGroupLaneIdentity[];
  evidenceSubjectIds: Iterable<number>;
}) {
  const evidence = new Set(input.evidenceSubjectIds);
  const laneSubjectIdsByGroupName = new Map<string, Set<number>>();

  for (const lane of input.groupLanes) {
    const groupName = normalizeReportSubjectName(lane.teachingGroup.name);
    const subjectIds = laneSubjectIdsByGroupName.get(groupName) ?? new Set<number>();
    subjectIds.add(lane.classSubject.subjectId);
    laneSubjectIdsByGroupName.set(groupName, subjectIds);
  }

  return new Set(input.classSubjects
    .filter((classSubject) => {
      const laneSubjectIds = laneSubjectIdsByGroupName.get(
        normalizeReportSubjectName(classSubject.subject.name),
      );
      return Boolean(
        laneSubjectIds &&
        !laneSubjectIds.has(classSubject.subjectId) &&
        !evidence.has(classSubject.subjectId),
      );
    })
    .map((classSubject) => classSubject.subjectId));
}

export async function loadExcludedCombinedLabelSubjectIds(
  client: any,
  input: { classId: number; termId: number },
) {
  const [classSubjects, groupLanes, grades, assignments, assessments] = await Promise.all([
    client.classSubject.findMany({
      where: { classId: input.classId, subject: { isArchived: false } },
      select: { id: true, subjectId: true, subject: { select: { name: true } } },
    }),
    client.teachingGroupClass.findMany({
      where: {
        classSubject: { classId: input.classId },
      },
      select: {
        classSubjectId: true,
        classSubject: { select: { subjectId: true } },
        teachingGroup: { select: { name: true } },
      },
    }),
    client.grade.findMany({
      where: { termId: input.termId, student: { classId: input.classId } },
      select: { subjectId: true },
      distinct: ["subjectId"],
    }),
    client.assignment.findMany({
      where: { termId: input.termId, teacherSubject: { classId: input.classId } },
      select: { teacherSubject: { select: { subjectId: true } } },
    }),
    client.assessment.findMany({
      where: { termId: input.termId, classId: input.classId },
      select: { subjectId: true },
    }),
  ]);

  return findUnbackedCombinedLabelSubjectIds({
    classSubjects,
    groupLanes,
    evidenceSubjectIds: [
      ...grades.map((grade: any) => grade.subjectId),
      ...assignments.map((assignment: any) => assignment.teacherSubject.subjectId),
      ...assessments.map((assessment: any) => assessment.subjectId),
    ],
  });
}

export function filterExcludedReportSubjects<T extends { subjectId: number }>(
  subjects: T[],
  excludedSubjectIds: ReadonlySet<number>,
) {
  return subjects.filter((subject) => !excludedSubjectIds.has(subject.subjectId));
}
