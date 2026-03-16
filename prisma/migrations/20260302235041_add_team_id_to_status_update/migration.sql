-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StatusUpdate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,
    "rawTranscript" TEXT NOT NULL,
    "completed" TEXT NOT NULL DEFAULT '[]',
    "inProgress" TEXT NOT NULL DEFAULT '[]',
    "blockers" TEXT NOT NULL DEFAULT '[]',
    "needsHelp" TEXT NOT NULL DEFAULT '[]',
    "sentiment" TEXT,
    "riskFlags" TEXT NOT NULL DEFAULT '[]',
    "summary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatusUpdate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StatusUpdate_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StatusUpdate" ("blockers", "completed", "createdAt", "id", "inProgress", "needsHelp", "rawTranscript", "riskFlags", "sentiment", "summary", "userId") SELECT "blockers", "completed", "createdAt", "id", "inProgress", "needsHelp", "rawTranscript", "riskFlags", "sentiment", "summary", "userId" FROM "StatusUpdate";
DROP TABLE "StatusUpdate";
ALTER TABLE "new_StatusUpdate" RENAME TO "StatusUpdate";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
