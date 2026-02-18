/*
  Warnings:

  - You are about to drop the column `finalScore` on the `Grade` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Grade` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[studentId,subjectId,termId]` on the table `Grade` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `average` to the `Grade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `termId` to the `Grade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total` to the `Grade` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Grade_studentId_subjectId_key";

-- AlterTable
ALTER TABLE "Grade" DROP COLUMN "finalScore",
DROP COLUMN "updatedAt",
ADD COLUMN     "average" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "termId" INTEGER NOT NULL,
ADD COLUMN     "total" DOUBLE PRECISION NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Grade_studentId_subjectId_termId_key" ON "Grade"("studentId", "subjectId", "termId");

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
