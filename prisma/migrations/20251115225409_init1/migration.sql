/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `Announcement` table. All the data in the column will be lost.
  - You are about to drop the column `coursSessionId` on the `SharedDocument` table. All the data in the column will be lost.
  - You are about to drop the column `professeurId` on the `SharedDocument` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the `_participants` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userId` to the `SharedDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ProgressStatus" ADD VALUE 'IN_PROGRESS';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'ADMIN';
ALTER TYPE "Role" ADD VALUE 'PARENT';

-- AlterEnum
ALTER TYPE "TaskCategory" ADD VALUE 'SOCIAL';

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_classroomId_fkey";

-- DropForeignKey
ALTER TABLE "Reaction" DROP CONSTRAINT "Reaction_messageId_fkey";

-- DropForeignKey
ALTER TABLE "SharedDocument" DROP CONSTRAINT "SharedDocument_coursSessionId_fkey";

-- DropForeignKey
ALTER TABLE "SharedDocument" DROP CONSTRAINT "SharedDocument_professeurId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_classeId_fkey";

-- DropForeignKey
ALTER TABLE "_participants" DROP CONSTRAINT "_participants_A_fkey";

-- DropForeignKey
ALTER TABLE "_participants" DROP CONSTRAINT "_participants_B_fkey";

-- DropIndex
DROP INDEX "Reaction_userId_messageId_emoji_key";

-- AlterTable
ALTER TABLE "Announcement" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "SharedDocument" DROP COLUMN "coursSessionId",
DROP COLUMN "professeurId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "StudentProgress" ALTER COLUMN "feedback" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "_participants";

-- CreateTable
CREATE TABLE "_SessionsAttended" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_SessionsAttended_AB_unique" ON "_SessionsAttended"("A", "B");

-- CreateIndex
CREATE INDEX "_SessionsAttended_B_index" ON "_SessionsAttended"("B");

-- CreateIndex
CREATE INDEX "Announcement_authorId_idx" ON "Announcement"("authorId");

-- CreateIndex
CREATE INDEX "Announcement_classeId_idx" ON "Announcement"("classeId");

-- CreateIndex
CREATE INDEX "Classroom_professeurId_idx" ON "Classroom"("professeurId");

-- CreateIndex
CREATE INDEX "Message_classroomId_idx" ON "Message"("classroomId");

-- CreateIndex
CREATE INDEX "Reaction_messageId_idx" ON "Reaction"("messageId");

-- CreateIndex
CREATE INDEX "Reaction_userId_idx" ON "Reaction"("userId");

-- CreateIndex
CREATE INDEX "SharedDocument_userId_idx" ON "SharedDocument"("userId");

-- CreateIndex
CREATE INDEX "StudentProgress_studentId_idx" ON "StudentProgress"("studentId");

-- CreateIndex
CREATE INDEX "User_classeId_idx" ON "User"("classeId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedDocument" ADD CONSTRAINT "SharedDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SessionsAttended" ADD CONSTRAINT "_SessionsAttended_A_fkey" FOREIGN KEY ("A") REFERENCES "CoursSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SessionsAttended" ADD CONSTRAINT "_SessionsAttended_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
