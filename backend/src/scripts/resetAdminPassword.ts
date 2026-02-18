import { prisma } from "../prisma/client";
import bcrypt from "bcrypt";

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.update({
    where: { email: "admin@school.com" },
    data: { password: hashedPassword },
  });

  console.log("✅ Admin password reset to: admin123");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
