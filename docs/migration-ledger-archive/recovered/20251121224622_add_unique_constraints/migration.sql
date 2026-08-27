/*
  Warnings:

  - A unique constraint covering the columns `[assessmentId,studentId]` on the table `AssessmentScore` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studentId,subjectId]` on the table `Grade` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "AssessmentScore_assessmentId_studentId_key" ON "AssessmentScore"("assessmentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_studentId_subjectId_key" ON "Grade"("studentId", "subjectId");
