/*
  Warnings:

  - You are about to drop the column `responseType` on the `AuditLog` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "AuditLog_responseType_idx";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "responseType";

-- CreateIndex
CREATE INDEX "AuditLog_type_idx" ON "AuditLog"("type");
