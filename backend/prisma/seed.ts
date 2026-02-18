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

  console.log("✅ Seeded users with real passwords");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
