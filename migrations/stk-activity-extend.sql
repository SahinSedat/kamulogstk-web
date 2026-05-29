-- ================================================
-- STKActivity Tablo Genişletme Migration
-- Mevcut tabloya: date, location, branchId ekleniyor
-- ================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'STKActivity' AND column_name = 'date') THEN
        ALTER TABLE "STKActivity" ADD COLUMN "date" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'STKActivity' AND column_name = 'location') THEN
        ALTER TABLE "STKActivity" ADD COLUMN "location" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'STKActivity' AND column_name = 'branchId') THEN
        ALTER TABLE "STKActivity" ADD COLUMN "branchId" TEXT;
    END IF;
END $$;

-- İndeksler
CREATE INDEX IF NOT EXISTS "STKActivity_stkId_idx" ON "STKActivity"("stkId");
CREATE INDEX IF NOT EXISTS "STKActivity_branchId_idx" ON "STKActivity"("branchId");
CREATE INDEX IF NOT EXISTS "STKActivity_date_idx" ON "STKActivity"("date");
CREATE INDEX IF NOT EXISTS "STKActivity_isPublished_idx" ON "STKActivity"("isPublished");

-- Foreign Key: branchId → STKBranch
ALTER TABLE "STKActivity" DROP CONSTRAINT IF EXISTS "STKActivity_branchId_fkey";
ALTER TABLE "STKActivity" ADD CONSTRAINT "STKActivity_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "STKBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
