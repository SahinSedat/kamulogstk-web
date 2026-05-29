-- STKOrganization tablosuna KamulogSTK schema'sının gerektirdiği eksik kolonları ekle
-- Mevcut 38 kolona dokunmadan sadece yeni kolonlar eklenir

DO $$ BEGIN
    -- İlan Kodu (Mobil arama)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'STKOrganization' AND column_name = 'adCode') THEN
        ALTER TABLE "STKOrganization" ADD COLUMN "adCode" TEXT;
    END IF;

    -- Çok Kanallı Kredi Sistemi
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'STKOrganization' AND column_name = 'smsCredits') THEN
        ALTER TABLE "STKOrganization" ADD COLUMN "smsCredits" INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'STKOrganization' AND column_name = 'whatsappCredits') THEN
        ALTER TABLE "STKOrganization" ADD COLUMN "whatsappCredits" INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'STKOrganization' AND column_name = 'emailCredits') THEN
        ALTER TABLE "STKOrganization" ADD COLUMN "emailCredits" INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'STKOrganization' AND column_name = 'pushCredits') THEN
        ALTER TABLE "STKOrganization" ADD COLUMN "pushCredits" INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- Manager ilişkisi (STK yöneticisi FK)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'STKOrganization' AND column_name = 'managerId') THEN
        ALTER TABLE "STKOrganization" ADD COLUMN "managerId" TEXT;
    END IF;

    -- Onay/Red bilgileri
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'STKOrganization' AND column_name = 'approvedAt') THEN
        ALTER TABLE "STKOrganization" ADD COLUMN "approvedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'STKOrganization' AND column_name = 'rejectedAt') THEN
        ALTER TABLE "STKOrganization" ADD COLUMN "rejectedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'STKOrganization' AND column_name = 'rejectionReason') THEN
        ALTER TABLE "STKOrganization" ADD COLUMN "rejectionReason" TEXT;
    END IF;

    -- Tüzük Belgesi
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'STKOrganization' AND column_name = 'statuteFile') THEN
        ALTER TABLE "STKOrganization" ADD COLUMN "statuteFile" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'STKOrganization' AND column_name = 'statuteUploadedAt') THEN
        ALTER TABLE "STKOrganization" ADD COLUMN "statuteUploadedAt" TIMESTAMP(3);
    END IF;

    -- Posta kodu ve paket
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'STKOrganization' AND column_name = 'postalCode') THEN
        ALTER TABLE "STKOrganization" ADD COLUMN "postalCode" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'STKOrganization' AND column_name = 'packageId') THEN
        ALTER TABLE "STKOrganization" ADD COLUMN "packageId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'STKOrganization' AND column_name = 'documents') THEN
        ALTER TABLE "STKOrganization" ADD COLUMN "documents" JSONB;
    END IF;
END $$;

-- İndeksler
CREATE UNIQUE INDEX IF NOT EXISTS "STKOrganization_adCode_key" ON "STKOrganization"("adCode");
CREATE UNIQUE INDEX IF NOT EXISTS "STKOrganization_managerId_key" ON "STKOrganization"("managerId");

-- ManagerId FK
ALTER TABLE "STKOrganization" DROP CONSTRAINT IF EXISTS "STKOrganization_managerId_fkey";
ALTER TABLE "STKOrganization" ADD CONSTRAINT "STKOrganization_managerId_fkey"
    FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

SELECT 'STKOrganization migration complete!' AS result;
