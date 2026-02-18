/*
  Warnings:

  - You are about to drop the column `catScore` on the `Grade` table. All the data in the column will be lost.
  - You are about to drop the column `comments` on the `Grade` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Grade` table. All the data in the column will be lost.
  - You are about to drop the column `examScore` on the `Grade` table. All the data in the column will be lost.
  - You are about to drop the column `grade` on the `Grade` table. All the data in the column will be lost.
  - You are about to drop the column `term` on the `Grade` table. All the data in the column will be lost.
  - You are about to drop the column `weightCat` on the `Grade` table. All the data in the column will be lost.
  - You are about to drop the column `weightExam` on the `Grade` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Grade` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AssessmentCategory" AS ENUM ('TEST', 'PROJECT', 'ASSIGNMENT', 'OTHER');

-- AlterTable
ALTER TABLE "Grade" DROP COLUMN "catScore",
DROP COLUMN "comments",
DROP COLUMN "createdAt",
DROP COLUMN "examScore",
DROP COLUMN "grade",
DROP COLUMN "term",
DROP COLUMN "weightCat",
DROP COLUMN "weightExam",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "AssessmentEvent" (
    "id" SERIAL NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" "AssessmentCategory" NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentScore" (
    "id" SERIAL NOT NULL,
    "assessmentId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentScore_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AssessmentEvent" ADD CONSTRAINT "AssessmentEvent_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentEvent" ADD CONSTRAINT "AssessmentEvent_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentScore" ADD CONSTRAINT "AssessmentScore_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "AssessmentEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentScore" ADD CONSTRAINT "AssessmentScore_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
