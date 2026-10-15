export async function listAdminGradebookClasses(client: any) {
  return client.class.findMany({
    where: { isArchived: false },
    select: { id: true, name: true, level: true },
    orderBy: { name: "asc" },
  });
}

export async function getAdminGradebookOptions(client: any, classId: number) {
  const schoolClass = await client.class.findFirst({
    where: { id: classId, isArchived: false },
    select: { id: true, name: true, level: true },
  });
  if (!schoolClass) return null;

  const [classSubjects, terms, teacherSubjects] = await Promise.all([
    client.classSubject.findMany({
      where: { classId, subject: { isArchived: false } },
      select: { subject: { select: { id: true, name: true, code: true } } },
      orderBy: { subject: { name: "asc" } },
    }),
    client.term.findMany({
      where: { classId },
      select: { id: true, name: true, academicYear: true, isActive: true, isLocked: true },
      orderBy: [{ academicYear: "desc" }, { startDate: "desc" }],
    }),
    client.teacherSubject.findMany({
      where: { classId, class: { isArchived: false }, subject: { isArchived: false } },
      select: {
        id: true,
        subjectId: true,
        teacherId: true,
        isActive: true,
        teacher: { select: { id: true, name: true, isActive: true, isArchived: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ subject: { name: "asc" } }, { isActive: "desc" }, { id: "desc" }],
    }),
  ]);

  return {
    class: schoolClass,
    subjects: classSubjects.map((entry: any) => entry.subject),
    terms,
    teacherSubjects,
  };
}

export async function getAdminGradebook(client: any, teacherSubjectId: number, termId: number) {
  const teacherSubject = await client.teacherSubject.findFirst({
    where: { id: teacherSubjectId, class: { isArchived: false }, subject: { isArchived: false } },
    select: {
      id: true,
      teacherId: true,
      subjectId: true,
      classId: true,
      isActive: true,
      teacher: { select: { id: true, name: true, isActive: true, isArchived: true } },
      subject: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, name: true, level: true } },
    },
  });
  if (!teacherSubject) return null;

  const term = await client.term.findFirst({
    where: { id: termId, classId: teacherSubject.classId },
    select: { id: true, name: true, academicYear: true, isActive: true, isLocked: true },
  });
  if (!term) return null;

  const [students, assignments] = await Promise.all([
    client.student.findMany({
      where: { classId: teacherSubject.classId, isArchived: false },
      select: { id: true, admissionNo: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    client.assignment.findMany({
      where: { teacherSubjectId, termId },
      select: {
        id: true,
        teacherSubjectId: true,
        title: true,
        maxPoints: true,
        isLocked: true,
        position: true,
        scores: {
          where: { student: { classId: teacherSubject.classId, isArchived: false } },
          select: { id: true, studentId: true, assignmentId: true, score: true, maxPoints: true },
        },
      },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    }),
  ]);

  return { teacherSubject, term, students, assignments };
}
