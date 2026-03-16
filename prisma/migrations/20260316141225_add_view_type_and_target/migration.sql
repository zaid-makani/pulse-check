-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_View" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "createdById" TEXT NOT NULL,
    "teamId" TEXT,
    "targetUserId" TEXT,
    "timeRange" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "View_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "View_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_View" ("createdAt", "createdById", "description", "id", "name", "teamId", "updatedAt") SELECT "createdAt", "createdById", "description", "id", "name", "teamId", "updatedAt" FROM "View";
DROP TABLE "View";
ALTER TABLE "new_View" RENAME TO "View";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
