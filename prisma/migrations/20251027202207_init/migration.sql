-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PROFESSEUR', 'ELEVE');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('HOME', 'LANGUAGE', 'MATH', 'SCIENCE', 'ART', 'SPORTS', 'SOCIAL');

-- CreateEnum
CREATE TYPE "TaskDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "ValidationType" AS ENUM ('AUTOMATIC', 'PARENT', 'PROFESSOR');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('TODO', 'PENDING_VALIDATION', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'ELEVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ambition" TEXT,
    "parentPassword" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "classeId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtatEleve" (
    "id" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "metierId" TEXT,
    "isPunished" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "EtatEleve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metier" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "theme" TEXT,

    CONSTRAINT "Metier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "professeurId" TEXT NOT NULL,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoursSession" (
    "id" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "professeurId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,

    CONSTRAINT "CoursSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentInHistory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coursSessionId" TEXT NOT NULL,

    CONSTRAINT "DocumentInHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "classeId" TEXT,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "senderId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "type" "TaskType" NOT NULL,
    "category" "TaskCategory" NOT NULL,
    "difficulty" "TaskDifficulty" NOT NULL,
    "validationType" "ValidationType" NOT NULL,
    "requiresProof" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'TODO',
    "completionDate" TIMESTAMP(3),
    "submissionUrl" TEXT,
    "pointsAwarded" INTEGER,
    "feedback" JSONB,
    "recipeName" TEXT,

    CONSTRAINT "StudentProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ParticipantSessions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_classeId_idx" ON "User"("classeId");

-- CreateIndex
CREATE UNIQUE INDEX "EtatEleve_eleveId_key" ON "EtatEleve"("eleveId");

-- CreateIndex
CREATE INDEX "EtatEleve_eleveId_idx" ON "EtatEleve"("eleveId");

-- CreateIndex
CREATE INDEX "EtatEleve_metierId_idx" ON "EtatEleve"("metierId");

-- CreateIndex
CREATE INDEX "Classroom_professeurId_idx" ON "Classroom"("professeurId");

-- CreateIndex
CREATE INDEX "CoursSession_professeurId_idx" ON "CoursSession"("professeurId");

-- CreateIndex
CREATE INDEX "CoursSession_classroomId_idx" ON "CoursSession"("classroomId");

-- CreateIndex
CREATE INDEX "DocumentInHistory_coursSessionId_idx" ON "DocumentInHistory"("coursSessionId");

-- CreateIndex
CREATE INDEX "Announcement_authorId_idx" ON "Announcement"("authorId");

-- CreateIndex
CREATE INDEX "Announcement_classeId_idx" ON "Announcement"("classeId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_classroomId_idx" ON "Message"("classroomId");

-- CreateIndex
CREATE INDEX "Reaction_userId_idx" ON "Reaction"("userId");

-- CreateIndex
CREATE INDEX "Reaction_messageId_idx" ON "Reaction"("messageId");

-- CreateIndex
CREATE INDEX "StudentProgress_studentId_idx" ON "StudentProgress"("studentId");

-- CreateIndex
CREATE INDEX "StudentProgress_taskId_idx" ON "StudentProgress"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProgress_studentId_taskId_key" ON "StudentProgress"("studentId", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "_ParticipantSessions_AB_unique" ON "_ParticipantSessions"("A", "B");

-- CreateIndex
CREATE INDEX "_ParticipantSessions_B_index" ON "_ParticipantSessions"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classroom"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtatEleve" ADD CONSTRAINT "EtatEleve_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtatEleve" ADD CONSTRAINT "EtatEleve_metierId_fkey" FOREIGN KEY ("metierId") REFERENCES "Metier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_professeurId_fkey" FOREIGN KEY ("professeurId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursSession" ADD CONSTRAINT "CoursSession_professeurId_fkey" FOREIGN KEY ("professeurId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursSession" ADD CONSTRAINT "CoursSession_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentInHistory" ADD CONSTRAINT "DocumentInHistory_coursSessionId_fkey" FOREIGN KEY ("coursSessionId") REFERENCES "CoursSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProgress" ADD CONSTRAINT "StudentProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProgress" ADD CONSTRAINT "StudentProgress_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ParticipantSessions" ADD CONSTRAINT "_ParticipantSessions_A_fkey" FOREIGN KEY ("A") REFERENCES "CoursSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ParticipantSessions" ADD CONSTRAINT "_ParticipantSessions_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
