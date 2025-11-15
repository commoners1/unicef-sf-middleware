-- AlterTable: Add keyHash column for fast API key validation
-- Start with nullable to handle existing records
ALTER TABLE "ApiKey" ADD COLUMN "keyHash" TEXT;

-- CreateIndex: Add unique index on keyHash for fast lookups (nullable for now)
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- Note: 
-- 1. Existing encrypted keys won't have keyHash yet (they're NULL)
-- 2. New keys will automatically have keyHash populated
-- 3. To fully migrate: Regenerate all existing API keys OR run a script to decrypt and re-hash them
-- 4. Once all keys have keyHash, you can make it NOT NULL with:
--    ALTER TABLE "ApiKey" ALTER COLUMN "keyHash" SET NOT NULL;

