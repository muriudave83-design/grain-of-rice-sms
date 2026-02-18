-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "categoryId" INTEGER;

-- CreateTable
CREATE TABLE "AssignmentCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "AssignmentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentCategory_name_key" ON "AssignmentCategory"("name");

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssignmentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
