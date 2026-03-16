/*
  Warnings:

  - Changed the type of `type` on the `Assessment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('EXAM', 'TEST', 'QUIZ', 'ASSIGNMENT', 'HOMEWORK');

-- AlterTable
ALTER TABLE "Assessment" DROP COLUMN "type",
ADD COLUMN     "type" "AssessmentType" NOT NULL;
