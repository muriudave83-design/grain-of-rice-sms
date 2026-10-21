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

export function subjectNameWithinClass(value: string, className: string) {
  const subjectName = normalizeReportSubjectName(value);
  const normalizedClassName = normalizeReportSubjectName(className);
  const prefixes = new Set([normalizedClassName]);
  const numberedClass = normalizedClassName.match(/^(?:GRADE|CLASS|FORM)\s+(\d+)$/);
  if (numberedClass) {
    prefixes.add(`GRADE ${numberedClass[1]}`);
    prefixes.add(`CLASS ${numberedClass[1]}`);
    prefixes.add(`FORM ${numberedClass[1]}`);
  }
  for (const prefix of prefixes) {
    if (subjectName.startsWith(`${prefix} `) || subjectName.startsWith(`${prefix}-`) || subjectName.startsWith(`${prefix}:`)) {
      return subjectName.slice(prefix.length + 1).trim();
    }
  }
  return subjectName;
}

export function findUnbackedCombinedLabelSubjectIds(input: {
  className?: string;
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

  const excluded = new Set(input.classSubjects
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

  if (!input.className) return excluded;

  const equivalentSubjects = new Map<string, ClassSubjectIdentity[]>();
  for (const classSubject of input.classSubjects) {
    const canonicalName = subjectNameWithinClass(classSubject.subject.name, input.className);
    const matches = equivalentSubjects.get(canonicalName) ?? [];
    matches.push(classSubject);
    equivalentSubjects.set(canonicalName, matches);
  }
  for (const matches of equivalentSubjects.values()) {
    if (matches.length < 2 || !matches.some((entry) => evidence.has(entry.subjectId))) continue;
    for (const classSubject of matches) {
      if (!evidence.has(classSubject.subjectId)) excluded.add(classSubject.subjectId);
    }
  }
  return excluded;
}

export async function loadExcludedCombinedLabelSubjectIds(
  client: any,
  input: { classId: number; termId: number },
) {
  const [schoolClass, classSubjects, groupLanes, grades, assignments, assessments] = await Promise.all([
    client.class.findUnique({
      where: { id: input.classId },
      select: { name: true },
    }),
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
      where: { student: { classId: input.classId } },
      select: { subjectId: true },
      distinct: ["subjectId"],
    }),
    client.assignment.findMany({
      where: { teacherSubject: { classId: input.classId } },
      select: { teacherSubject: { select: { subjectId: true } } },
    }),
    client.assessment.findMany({
      where: { classId: input.classId },
      select: { subjectId: true },
    }),
  ]);

  return findUnbackedCombinedLabelSubjectIds({
    className: schoolClass?.name,
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
