-- AlterTable
ALTER TABLE "TeamSettings" ADD COLUMN "slackChannelId" TEXT;
ALTER TABLE "TeamSettings" ADD COLUMN "slackWebhookUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "slackUserId" TEXT;

-- CreateTable
CREATE TABLE "SlackInstallation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "botToken" TEXT NOT NULL,
    "botUserId" TEXT NOT NULL,
    "installedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SlackInstallation_teamId_key" ON "SlackInstallation"("teamId");
