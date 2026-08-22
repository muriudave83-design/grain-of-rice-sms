import fs from "node:fs";
import path from "node:path";
import { prisma } from "../prisma/client";

async function main() {
  const auditSql = fs.readFileSync(
    path.resolve(process.cwd(), "prisma/audits/student-class-history-conflicts.sql"),
    "utf8",
  );
  const conflicts = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(auditSql);
  const student204 = await prisma.student.findUnique({
    where: { id: 204 },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      admissionNo: true,
      isArchived: true,
      classId: true,
      class: { select: { name: true } },
    },
  });

  console.log(JSON.stringify({ conflictCount: conflicts.length, conflicts, student204 }, null, 2));
}

main()
  .catch((error) => {
    console.error("Student class-history audit failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
