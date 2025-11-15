-- CreateTable
CREATE TABLE "whiteboard_operations" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whiteboard_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whiteboard_operations_sessionId_idx" ON "whiteboard_operations"("sessionId");

-- CreateIndex
CREATE INDEX "whiteboard_operations_timestamp_idx" ON "whiteboard_operations"("timestamp");

-- AddForeignKey
ALTER TABLE "whiteboard_operations" ADD CONSTRAINT "whiteboard_operations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CoursSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whiteboard_operations" ADD CONSTRAINT "whiteboard_operations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
