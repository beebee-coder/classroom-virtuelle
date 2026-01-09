/*
  Warnings:

  - The values [TODO] on the enum `ProgressStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [SCHOOL,SOCIAL] on the enum `TaskCategory` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `updatedAt` on the `Announcement` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the `VerificationToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_StudentToSession` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,messageId,emoji]` on the table `Reaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `EtatEleve` table without a default value. This is not possible if the table is not empty.
  - Added the required column `theme` to the `Metier` table without a default value. This is not possible if the table is not empty.
  - Made the column `answerTimestamps` on table `QuizResponse` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProgressStatus_new" AS ENUM ('PENDING_VALIDATION', 'VERIFIED', 'REJECTED');
ALTER TABLE "StudentProgress" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "StudentProgress" ALTER COLUMN "status" TYPE "ProgressStatus_new" USING ("status"::text::"ProgressStatus_new");
ALTER TYPE "ProgressStatus" RENAME TO "ProgressStatus_old";
ALTER TYPE "ProgressStatus_new" RENAME TO "ProgressStatus";
DROP TYPE "ProgressStatus_old";
ALTER TABLE "StudentProgress" ALTER COLUMN "status" SET DEFAULT 'PENDING_VALIDATION';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TaskCategory_new" AS ENUM ('HOME', 'MATH', 'LANGUAGE', 'SCIENCE', 'ART', 'SPORT');
ALTER TABLE "Task" ALTER COLUMN "category" TYPE "TaskCategory_new" USING ("category"::text::"TaskCategory_new");
ALTER TYPE "TaskCategory" RENAME TO "TaskCategory_old";
ALTER TYPE "TaskCategory_new" RENAME TO "TaskCategory";
DROP TYPE "TaskCategory_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Announcement" DROP CONSTRAINT "Announcement_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Announcement" DROP CONSTRAINT "Announcement_classeId_fkey";

-- DropForeignKey
ALTER TABLE "Quiz" DROP CONSTRAINT "Quiz_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_createdById_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_classeId_fkey";

-- DropForeignKey
ALTER TABLE "_StudentToSession" DROP CONSTRAINT "_StudentToSession_A_fkey";

-- DropForeignKey
ALTER TABLE "_StudentToSession" DROP CONSTRAINT "_StudentToSession_B_fkey";

-- DropIndex
DROP INDEX "Reaction_messageId_userId_emoji_key";

-- AlterTable
ALTER TABLE "Announcement" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "EtatEleve" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Metier" DROP COLUMN "theme",
ADD COLUMN     "theme" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "QuizResponse" ALTER COLUMN "answerTimestamps" SET NOT NULL;

-- AlterTable
ALTER TABLE "StudentProgress" ALTER COLUMN "completionDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "createdById",
ADD COLUMN     "attachmentUrl" TEXT;

-- DropTable
DROP TABLE "VerificationToken";

-- DropTable
DROP TABLE "_StudentToSession";

-- CreateTable
CREATE TABLE "_ParticipatedSessions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ParticipatedSessions_AB_unique" ON "_ParticipatedSessions"("A", "B");

-- CreateIndex
CREATE INDEX "_ParticipatedSessions_B_index" ON "_ParticipatedSessions"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_messageId_emoji_key" ON "Reaction"("userId", "messageId", "emoji");

-- CreateIndex
CREATE INDEX "User_classeId_idx" ON "User"("classeId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ParticipatedSessions" ADD CONSTRAINT "_ParticipatedSessions_A_fkey" FOREIGN KEY ("A") REFERENCES "CoursSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ParticipatedSessions" ADD CONSTRAINT "_ParticipatedSessions_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
