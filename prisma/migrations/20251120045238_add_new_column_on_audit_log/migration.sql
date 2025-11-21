-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "referenceId" TEXT,
ADD COLUMN     "responseType" TEXT,
ADD COLUMN     "salesforceId" TEXT,
ADD COLUMN     "statusMessage" TEXT,
ADD COLUMN     "statusPayment" TEXT;

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "AuditLog_referenceId_idx" ON "AuditLog"("referenceId");

-- CreateIndex
CREATE INDEX "AuditLog_salesforceId_idx" ON "AuditLog"("salesforceId");

-- CreateIndex
CREATE INDEX "AuditLog_responseType_idx" ON "AuditLog"("responseType");

-- CreateIndex
CREATE INDEX "AuditLog_statusPayment_idx" ON "AuditLog"("statusPayment");

-- CreateIndex
CREATE INDEX "AuditLog_ipAddress_idx" ON "AuditLog"("ipAddress");
