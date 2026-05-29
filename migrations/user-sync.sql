-- User tablosuna KamulogSTK schema'sının gerektirdiği eksik kolonları ekle
-- Mevcut kolonlara dokunmadan sadece yeni kolonlar eklenir

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'status') THEN
        ALTER TABLE "User" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'occupation') THEN
        ALTER TABLE "User" ADD COLUMN "occupation" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'workplace') THEN
        ALTER TABLE "User" ADD COLUMN "workplace" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'education') THEN
        ALTER TABLE "User" ADD COLUMN "education" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'preferredCity') THEN
        ALTER TABLE "User" ADD COLUMN "preferredCity" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'notifSystem') THEN
        ALTER TABLE "User" ADD COLUMN "notifSystem" BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'gender') THEN
        ALTER TABLE "User" ADD COLUMN "gender" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'birthDate') THEN
        ALTER TABLE "User" ADD COLUMN "birthDate" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'registrationPurpose') THEN
        ALTER TABLE "User" ADD COLUMN "registrationPurpose" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'isStkOfficial') THEN
        ALTER TABLE "User" ADD COLUMN "isStkOfficial" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'stkOfficialRole') THEN
        ALTER TABLE "User" ADD COLUMN "stkOfficialRole" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'isStkMember') THEN
        ALTER TABLE "User" ADD COLUMN "isStkMember" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'memberStkName') THEN
        ALTER TABLE "User" ADD COLUMN "memberStkName" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'avatar') THEN
        ALTER TABLE "User" ADD COLUMN "avatar" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'lastLoginAt') THEN
        ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");

SELECT 'User table columns synced successfully!' AS result;
