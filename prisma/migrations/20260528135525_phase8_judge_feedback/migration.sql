/*
  Warnings:

  - Added the required column `updatedAt` to the `HumanFeedback` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EvalResult" ADD COLUMN     "judgeReasoning" TEXT,
ADD COLUMN     "judgeScore" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "EvalRun" ADD COLUMN     "avgJudgeScore" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "HumanFeedback" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "HumanFeedback" ADD CONSTRAINT "HumanFeedback_evalResultId_fkey" FOREIGN KEY ("evalResultId") REFERENCES "EvalResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
