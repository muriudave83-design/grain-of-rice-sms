import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  // ADMIN
  await prisma.user.upsert({
    where: { email: "admin@school.com" },
    update: {},
    create: {
      email: "admin@school.com",
      password: passwordHash,
      role: "ADMIN",
      name: "System Admin",
    },
  });

  // TEACHER
  await prisma.user.upsert({
    where: { email: "teacher@school.com" },
    update: {},
    create: {
      email: "teacher@school.com",
      password: passwordHash,
      role: "TEACHER",
      name: "Demo Teacher",
    },
  });

  // PARENT
  await prisma.user.upsert({
    where: { email: "parent@school.com" },
    update: {},
    create: {
      email: "parent@school.com",
      password: passwordHash,
      role: "PARENT",
      name: "Demo Parent",
    },
  });

  // TERM
  await prisma.term.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Term 1",
      classId: 1,
      academicYear: "2026",
      startDate: new Date("2026-01-10"),
      endDate: new Date("2026-04-10"),
    },
  });

  console.log("✅ Seeded users and term successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
