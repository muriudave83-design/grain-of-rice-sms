/*
  Warnings:

  - You are about to drop the column `comments` on the `ReportCard` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `ReportCard` table. All the data in the column will be lost.
  - You are about to drop the column `gradePosition` on the `ReportCard` table. All the data in the column will be lost.
  - You are about to drop the column `totalScore` on the `ReportCard` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ReportCard` table. All the data in the column will be lost.
  - You are about to drop the column `caScore` on the `ReportCardSubjectEntry` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `ReportCardSubjectEntry` table. All the data in the column will be lost.
  - You are about to drop the column `examScore` on the `ReportCardSubjectEntry` table. All the data in the column will be lost.
  - You are about to drop the column `finalScore` on the `ReportCardSubjectEntry` table. All the data in the column will be lost.
  - You are about to drop the column `teacherId` on the `ReportCardSubjectEntry` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[reportCardId,subjectId]` on the table `ReportCardSubjectEntry` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `total` to the `ReportCard` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `ReportCard` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `average` to the `ReportCardSubjectEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total` to the `ReportCardSubjectEntry` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReportCardStatus" AS ENUM ('GENERATED', 'PUBLISHED');

-- DropForeignKey
ALTER TABLE "ReportCardSubjectEntry" DROP CONSTRAINT "ReportCardSubjectEntry_teacherId_fkey";

-- AlterTable
ALTER TABLE "ReportCard" DROP COLUMN "comments",
DROP COLUMN "createdAt",
DROP COLUMN "gradePosition",
DROP COLUMN "totalScore",
DROP COLUMN "updatedAt",
ADD COLUMN     "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "total" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "average" DROP DEFAULT,
DROP COLUMN "status",
ADD COLUMN     "status" "ReportCardStatus" NOT NULL;

-- AlterTable
ALTER TABLE "ReportCardSubjectEntry" DROP COLUMN "caScore",
DROP COLUMN "createdAt",
DROP COLUMN "examScore",
DROP COLUMN "finalScore",
DROP COLUMN "teacherId",
ADD COLUMN     "average" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "total" DOUBLE PRECISION NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ReportCardSubjectEntry_reportCardId_subjectId_key" ON "ReportCardSubjectEntry"("reportCardId", "subjectId");
