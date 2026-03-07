import { prisma } from "../prisma/client";

async function migrate() {
  console.log("Starting teacher assignment migration...");

  const subjects = await prisma.subject.findMany({
    where: {
      teacherId: { not: null }
    },
    include: {
      classSubjects: true
    }
  });

  for (const subject of subjects) {
    for (const cs of subject.classSubjects) {

      const existing = await prisma.teacherSubject.findFirst({
        where: {
          teacherId: subject.teacherId!,
          subjectId: subject.id,
          classId: cs.classId
        }
      });

      if (!existing) {
        await prisma.teacherSubject.create({
          data: {
            teacherId: subject.teacherId!,
            subjectId: subject.id,
            classId: cs.classId
          }
        });

        console.log(
          `Created assignment: teacher ${subject.teacherId} → subject ${subject.id} → class ${cs.classId}`
        );
      } else {
        console.log(
          `Skipping existing assignment: teacher ${subject.teacherId} → subject ${subject.id} → class ${cs.classId}`
        );
      }
    }
  }

  console.log("Migration completed.");
}

migrate()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });