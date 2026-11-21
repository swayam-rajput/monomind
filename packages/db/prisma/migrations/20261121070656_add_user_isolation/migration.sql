/*
  Adding userId column to existing tables. Providing a default for existing rows.
  The default '00000000-0000-0000-0000-000000000000' represents the legacy single-user data.
  New users will get their own UUID.
*/
-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN     "title" TEXT DEFAULT 'New Chat',
ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- CreateIndex
CREATE INDEX "ChatSession_userId_idx" ON "ChatSession"("userId");

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

-- CreateIndex
CREATE INDEX "Note_userId_idx" ON "Note"("userId");