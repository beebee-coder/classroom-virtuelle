/*
  Warnings:

  - Added the required column `answerTimestamps` to the `QuizResponse` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "QuizResponse" ADD COLUMN     "answerTimestamps" JSONB NOT NULL;
