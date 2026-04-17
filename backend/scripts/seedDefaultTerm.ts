import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const classes = await prisma.class.findMany();

  for (const cls of classes) {
    const term = await prisma.term.create({
      data: {
        name: "Term 1",
        classId: cls.id,
        startDate: new Date(),
        endDate: new Date(),
        academicYear: "2026",
      },
    });

    await prisma.assignment.updateMany({
      where: {
        teacherSubject: {
          classId: cls.id,
        },
      },
      data: {
        termId: term.id,
      },
    });
  }

  console.log("✅ Default terms created and assignments patched");
}

main()
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });