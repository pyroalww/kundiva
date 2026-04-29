-- CreateTable
CREATE TABLE "UserAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "method" TEXT,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BannedIp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ipAddress" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "createdById" TEXT,
    CONSTRAINT "BannedIp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "studentNumber" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "subjectArea" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENEL',
    "educationLevel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "solverType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "ocrText" TEXT,
    "aiEthicsFlag" BOOLEAN,
    "assignedTeacherId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Question_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Question_assignedTeacherId_fkey" FOREIGN KEY ("assignedTeacherId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Question" ("aiEthicsFlag", "assignedTeacherId", "course", "createdAt", "description", "educationLevel", "firstName", "id", "lastName", "ocrText", "solverType", "status", "studentId", "studentNumber", "subjectArea", "subjectName", "title", "updatedAt") SELECT "aiEthicsFlag", "assignedTeacherId", "course", "createdAt", "description", "educationLevel", "firstName", "id", "lastName", "ocrText", "solverType", "status", "studentId", "studentNumber", "subjectArea", "subjectName", "title", "updatedAt" FROM "Question";
DROP TABLE "Question";
ALTER TABLE "new_Question" RENAME TO "Question";
CREATE INDEX "Question_solverType_status_idx" ON "Question"("solverType", "status");
CREATE INDEX "Question_assignedTeacherId_idx" ON "Question"("assignedTeacherId");
CREATE INDEX "Question_title_idx" ON "Question"("title");
CREATE TABLE "new_QuestionAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionAttachment_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_QuestionAttachment" ("createdAt", "durationMs", "fileSize", "id", "mimeType", "originalName", "questionId", "storagePath", "type") SELECT "createdAt", "durationMs", "fileSize", "id", "mimeType", "originalName", "questionId", "storagePath", "type" FROM "QuestionAttachment";
DROP TABLE "QuestionAttachment";
ALTER TABLE "new_QuestionAttachment" RENAME TO "QuestionAttachment";
CREATE INDEX "QuestionAttachment_questionId_idx" ON "QuestionAttachment"("questionId");
CREATE TABLE "new_SupportMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SupportMessage" ("content", "createdAt", "id", "senderType", "ticketId") SELECT "content", "createdAt", "id", "senderType", "ticketId" FROM "SupportMessage";
DROP TABLE "SupportMessage";
ALTER TABLE "new_SupportMessage" RENAME TO "SupportMessage";
CREATE TABLE "new_SupportTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "subject" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_SupportTicket" ("createdAt", "email", "id", "status", "subject", "updatedAt", "userId") SELECT "createdAt", "email", "id", "status", "subject", "updatedAt", "userId" FROM "SupportTicket";
DROP TABLE "SupportTicket";
ALTER TABLE "new_SupportTicket" RENAME TO "SupportTicket";
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "studentNumber" TEXT,
    "subjects" TEXT,
    "educationLevels" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "username" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "shadowBanned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "banExpiresAt" DATETIME,
    "lastSeenAt" DATETIME,
    "lastSeenIp" TEXT,
    "lastSeenUserAgent" TEXT
);
INSERT INTO "new_User" ("createdAt", "educationLevels", "email", "firstName", "id", "lastName", "passwordHash", "role", "studentNumber", "subjects", "updatedAt", "username") SELECT "createdAt", "educationLevels", "email", "firstName", "id", "lastName", "passwordHash", "role", "studentNumber", "subjects", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "UserAuditLog_userId_createdAt_idx" ON "UserAuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserAuditLog_createdAt_idx" ON "UserAuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BannedIp_ipAddress_key" ON "BannedIp"("ipAddress");
