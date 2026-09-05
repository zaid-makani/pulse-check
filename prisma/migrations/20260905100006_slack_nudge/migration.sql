-- CreateTable
CREATE TABLE "SlackNudge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "ts" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlackNudge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlackNudge_userId_sentAt_idx" ON "SlackNudge"("userId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "SlackNudge_channelId_ts_key" ON "SlackNudge"("channelId", "ts");
