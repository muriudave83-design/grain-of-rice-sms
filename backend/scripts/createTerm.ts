import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const term = await prisma.term.create({
    data: {
      name: "Term 2",
      classId: 1, // 🔴 make sure this exists

      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-08-01"),
      academicYear: "2026",
    },
  });

  console.log("✅ Created:", term);
}

main().finally(() => prisma.$disconnect());