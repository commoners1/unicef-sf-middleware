-- DropIndex
DROP INDEX IF EXISTS "public"."ApiKey_key_idx";

-- DropIndex
DROP INDEX IF EXISTS "public"."ApiKey_key_key";

-- Note: keyHash index will be created in migration 20251101204832 after the column is added
