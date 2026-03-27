const { PrismaClient } = require("@prisma/client");
const bcryptjs = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "sarah.teacher@test.com";
  const newPassword = "123456"; // 👈 use this to login

  const hashedPassword = await bcryptjs.hash(newPassword, 10);

  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });

  console.log("✅ Password reset for:", email);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });