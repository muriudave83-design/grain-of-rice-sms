import { prisma } from "../prisma/client";

async function main() {
  const categories = ["Homework", "Quiz", "Test", "Project"];

  for (const name of categories) {
    await prisma.assignmentCategory.upsert({
      where: { name },
      update: {},
      create: { name, weight: 1 },
    });
  }

  console.log("Assignment categories seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
