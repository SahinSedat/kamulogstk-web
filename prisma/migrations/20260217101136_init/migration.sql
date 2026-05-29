-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STK_MANAGER', 'CITIZEN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "STKType" AS ENUM ('DERNEK', 'VAKIF', 'SENDIKA', 'MESLEK_ODA', 'KOOPERATIF', 'DIGER');

-- CreateEnum
CREATE TYPE "STKStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BoardPosition" AS ENUM ('PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY', 'TREASURER', 'MEMBER', 'AUDITOR');

-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateEnum
CREATE TYPE "DecisionMemberType" AS ENUM ('MEMBERSHIP_ACCEPT', 'RESIGNATION_ACCEPT', 'RESIGNATION_REJECT', 'EXPULSION', 'OTHER');

-- CreateEnum
CREATE TYPE "MemberCategory" AS ENUM ('ASIL', 'FAHRI', 'ONURSAL', 'KURUMSAL', 'GENCLIK', 'GONULLU');

-- CreateEnum
CREATE TYPE "RegistrationSource" AS ENUM ('ONLINE', 'FORM', 'REFERENCE', 'TRANSFER', 'FOUNDING');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('APPLIED', 'PENDING', 'ACTIVE', 'RESIGNATION_REQ', 'RESIGNED', 'EXPELLED', 'INACTIVE', 'DECEASED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "DuesPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'BIANNUAL', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('FORGIVENESS', 'DISCOUNT', 'DEFERMENT');

-- CreateEnum
CREATE TYPE "PaymentAccountType" AS ENUM ('BANK_ACCOUNT', 'IBAN', 'CREDIT_CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DUES', 'DONATION', 'REGISTRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('USER_LOGIN', 'USER_LOGOUT', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'STK_CREATE', 'STK_UPDATE', 'STK_APPROVE', 'STK_REJECT', 'STK_SUSPEND', 'STK_ACTIVATE', 'MEMBER_CREATE', 'MEMBER_UPDATE', 'MEMBER_APPROVE', 'MEMBER_REJECT', 'MEMBER_RESIGN', 'MEMBER_EXPEL', 'PAYMENT_CREATE', 'PAYMENT_CONFIRM', 'PAYMENT_REJECT', 'PAYMENT_CANCEL', 'BOARD_DECISION', 'BOARD_MEMBER_ADD', 'BOARD_MEMBER_REMOVE', 'DUES_PLAN_CREATE', 'DUES_PLAN_UPDATE', 'PACKAGE_CREATE', 'PACKAGE_UPDATE', 'SETTINGS_UPDATE', 'DOCUMENT_CREATE', 'DOCUMENT_UPDATE', 'DOCUMENT_DELETE', 'DOCUMENT_PUBLISH', 'DOMAIN_REQUEST_CREATE', 'DOMAIN_REQUEST_UPDATE');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('SMS', 'PUSH', 'EMAIL');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TargetAudience" AS ENUM ('ALL_ACTIVE', 'DUES_PAID', 'DUES_UNPAID', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ANNOUNCEMENT', 'DOCUMENT', 'INFORMATION');

-- CreateEnum
CREATE TYPE "AssemblyType" AS ENUM ('OLAGAN', 'OLAGANUSTU');

-- CreateEnum
CREATE TYPE "AssemblyStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('IN_PERSON', 'BY_PROXY');

-- CreateEnum
CREATE TYPE "AttendeeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('UYEBELGESI', 'AIDAT_MAKBUZU', 'IHTAR', 'GENEL_YAZI', 'DAVET', 'VEKALETNAME', 'TUTANAK');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('MEMBER', 'PAYMENT', 'DECISION', 'ASSEMBLY', 'DOCUMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STK_MANAGER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "emailVerified" TIMESTAMP(3),
    "avatar" TEXT,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "occupation" TEXT,
    "workplace" TEXT,
    "education" TEXT,
    "preferredCity" TEXT,
    "notifSms" BOOLEAN NOT NULL DEFAULT true,
    "notifEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifSystem" BOOLEAN NOT NULL DEFAULT true,
    "gender" TEXT,
    "birthDate" TIMESTAMP(3),
    "registrationPurpose" TEXT,
    "isStkOfficial" BOOLEAN NOT NULL DEFAULT false,
    "stkOfficialRole" TEXT,
    "isStkMember" BOOLEAN NOT NULL DEFAULT false,
    "memberStkName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "STK" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "type" "STKType" NOT NULL,
    "status" "STKStatus" NOT NULL DEFAULT 'PENDING',
    "registrationNumber" TEXT,
    "taxNumber" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "postalCode" TEXT,
    "foundedAt" TIMESTAMP(3),
    "logo" TEXT,
    "description" TEXT,
    "documents" JSONB,
    "statuteFile" TEXT,
    "statuteUploadedAt" TIMESTAMP(3),
    "managerId" TEXT NOT NULL,
    "packageId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "STK_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "STKApplication" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "applicationLetter" TEXT,
    "statutes" TEXT,
    "boardResolution" TEXT,
    "otherDocuments" JSONB,
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "STKApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardMember" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tcKimlik" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "position" "BoardPosition" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hasSignature" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardDecision" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "decisionNumber" TEXT NOT NULL,
    "decisionDate" TIMESTAMP(3) NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT,
    "description" TEXT,
    "documentPath" TEXT,
    "status" "DecisionStatus" NOT NULL DEFAULT 'DRAFT',
    "relatedMemberId" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionMember" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "DecisionMemberType" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "userId" TEXT,
    "memberNumber" TEXT,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "tcKimlik" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "postalCode" TEXT,
    "occupation" TEXT,
    "workplace" TEXT,
    "education" TEXT,
    "status" "MemberStatus" NOT NULL DEFAULT 'APPLIED',
    "category" "MemberCategory" NOT NULL DEFAULT 'ASIL',
    "membershipType" TEXT,
    "joinDate" TIMESTAMP(3),
    "leaveDate" TIMESTAMP(3),
    "leaveReason" TEXT,
    "registrationSource" "RegistrationSource" NOT NULL DEFAULT 'ONLINE',
    "referredBy" TEXT,
    "wetSignatureStatus" BOOLEAN NOT NULL DEFAULT false,
    "wetSignatureDate" TIMESTAMP(3),
    "wetSignatureNote" TEXT,
    "kvkkConsent" BOOLEAN NOT NULL DEFAULT false,
    "kvkkConsentDate" TIMESTAMP(3),
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipApplication" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "applicationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applicationForm" TEXT,
    "supportingDocs" JSONB,
    "status" "MemberStatus" NOT NULL DEFAULT 'APPLIED',
    "reviewedBy" TEXT,
    "reviewDate" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "boardDecisionNumber" TEXT,
    "boardDecisionDate" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberNote" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PackageStatus" NOT NULL DEFAULT 'ACTIVE',
    "monthlyPrice" DECIMAL(10,2) NOT NULL,
    "yearlyPrice" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "maxMembers" INTEGER,
    "maxBoardMembers" INTEGER,
    "features" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuesPlan" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "period" "DuesPeriod" NOT NULL DEFAULT 'MONTHLY',
    "customPeriodDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DuesPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuesDiscount" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "originalAmount" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "discountPercent" INTEGER,
    "reason" TEXT NOT NULL,
    "decisionNumber" TEXT,
    "decisionDate" TIMESTAMP(3),
    "approvedBy" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DuesDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAccount" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "type" "PaymentAccountType" NOT NULL,
    "bankName" TEXT,
    "accountName" TEXT NOT NULL,
    "iban" TEXT,
    "accountNumber" TEXT,
    "branchCode" TEXT,
    "swiftCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "memberId" TEXT,
    "type" "PaymentType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "paymentDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "confirmDate" TIMESTAMP(3),
    "receiptNumber" TEXT,
    "transactionRef" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "confirmedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "userId" TEXT,
    "userEmail" TEXT,
    "userName" TEXT,
    "description" TEXT,
    "oldData" JSONB,
    "newData" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "stkId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "link" TEXT,
    "metadata" JSONB,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "totalEmployees" INTEGER,
    "lastUpdated" TIMESTAMP(3),
    "dataSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInterest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectorRegionalData" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "cityCode" TEXT NOT NULL,
    "totalEmployees" INTEGER NOT NULL,
    "dataSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectorRegionalData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "STKSector" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "STKSector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL,
    "city" TEXT,
    "dataSource" TEXT,
    "reportDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlySnapshot" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalMembers" INTEGER NOT NULL,
    "newMembers" INTEGER NOT NULL,
    "resignedMembers" INTEGER NOT NULL,
    "expelledMembers" INTEGER NOT NULL,
    "totalDuesCollected" DECIMAL(12,2) NOT NULL,
    "duesCollectionRate" DECIMAL(5,2) NOT NULL,
    "cityDistribution" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageCampaign" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "messageType" "MessageType" NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "targetAudience" "TargetAudience" NOT NULL DEFAULT 'ALL_ACTIVE',
    "targetFilters" JSONB,
    "status" "MessageStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedReason" TEXT,
    "blockedAt" TIMESTAMP(3),
    "blockedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberNotification" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "data" JSONB,
    "memberId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainRequest" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "wantsWebsite" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "status" "DomainStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "DocumentType" NOT NULL DEFAULT 'ANNOUNCEMENT',
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralAssembly" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "assemblyType" "AssemblyType" NOT NULL,
    "assemblyNumber" INTEGER NOT NULL,
    "assemblyDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "quorumRequired" INTEGER NOT NULL,
    "attendeeCount" INTEGER,
    "proxyCount" INTEGER,
    "minutesContent" TEXT,
    "minutesPdf" TEXT,
    "status" "AssemblyStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneralAssembly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssemblyAgendaItem" (
    "id" TEXT NOT NULL,
    "assemblyId" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "decision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssemblyAgendaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssemblyAttendee" (
    "id" TEXT NOT NULL,
    "assemblyId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "attendType" "AttendanceType" NOT NULL DEFAULT 'IN_PERSON',
    "status" "AttendeeStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "respondedAt" TIMESTAMP(3),
    "checkinTime" TIMESTAMP(3),
    "signature" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssemblyAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssemblyProxy" (
    "id" TEXT NOT NULL,
    "assemblyId" TEXT NOT NULL,
    "giverId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "proxyDoc" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssemblyProxy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TemplateCategory" NOT NULL,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "STKRole" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "STKRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Archive" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "recordType" "RecordType" NOT NULL,
    "recordId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Archive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationHistory" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "MemberStatus" NOT NULL,
    "applicationDate" TIMESTAMP(3),
    "boardDecisionNumber" TEXT,
    "boardDecisionDate" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "reviewNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResignationHistory" (
    "id" TEXT NOT NULL,
    "stkId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "resignationDate" TIMESTAMP(3) NOT NULL,
    "leaveReason" TEXT,
    "status" "MemberStatus" NOT NULL,
    "boardDecisionNumber" TEXT,
    "boardDecisionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResignationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "STK_slug_key" ON "STK"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "STK_registrationNumber_key" ON "STK"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "STK_managerId_key" ON "STK"("managerId");

-- CreateIndex
CREATE INDEX "STK_status_idx" ON "STK"("status");

-- CreateIndex
CREATE INDEX "STK_type_idx" ON "STK"("type");

-- CreateIndex
CREATE INDEX "STK_name_idx" ON "STK"("name");

-- CreateIndex
CREATE INDEX "STK_city_idx" ON "STK"("city");

-- CreateIndex
CREATE UNIQUE INDEX "STKApplication_stkId_key" ON "STKApplication"("stkId");

-- CreateIndex
CREATE INDEX "BoardMember_stkId_idx" ON "BoardMember"("stkId");

-- CreateIndex
CREATE INDEX "BoardMember_position_idx" ON "BoardMember"("position");

-- CreateIndex
CREATE INDEX "BoardMember_isActive_idx" ON "BoardMember"("isActive");

-- CreateIndex
CREATE INDEX "BoardDecision_stkId_idx" ON "BoardDecision"("stkId");

-- CreateIndex
CREATE INDEX "BoardDecision_decisionDate_idx" ON "BoardDecision"("decisionDate");

-- CreateIndex
CREATE INDEX "BoardDecision_status_idx" ON "BoardDecision"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BoardDecision_stkId_decisionNumber_key" ON "BoardDecision"("stkId", "decisionNumber");

-- CreateIndex
CREATE INDEX "DecisionMember_decisionId_idx" ON "DecisionMember"("decisionId");

-- CreateIndex
CREATE INDEX "DecisionMember_memberId_idx" ON "DecisionMember"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionMember_decisionId_memberId_key" ON "DecisionMember"("decisionId", "memberId");

-- CreateIndex
CREATE INDEX "Member_stkId_idx" ON "Member"("stkId");

-- CreateIndex
CREATE INDEX "Member_status_idx" ON "Member"("status");

-- CreateIndex
CREATE INDEX "Member_category_idx" ON "Member"("category");

-- CreateIndex
CREATE INDEX "Member_name_surname_idx" ON "Member"("name", "surname");

-- CreateIndex
CREATE UNIQUE INDEX "Member_stkId_memberNumber_key" ON "Member"("stkId", "memberNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Member_stkId_email_key" ON "Member"("stkId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipApplication_memberId_key" ON "MembershipApplication"("memberId");

-- CreateIndex
CREATE INDEX "MembershipApplication_stkId_idx" ON "MembershipApplication"("stkId");

-- CreateIndex
CREATE INDEX "MembershipApplication_status_idx" ON "MembershipApplication"("status");

-- CreateIndex
CREATE INDEX "MemberNote_memberId_idx" ON "MemberNote"("memberId");

-- CreateIndex
CREATE INDEX "Package_status_idx" ON "Package"("status");

-- CreateIndex
CREATE INDEX "DuesPlan_stkId_idx" ON "DuesPlan"("stkId");

-- CreateIndex
CREATE INDEX "DuesPlan_isActive_idx" ON "DuesPlan"("isActive");

-- CreateIndex
CREATE INDEX "DuesDiscount_stkId_idx" ON "DuesDiscount"("stkId");

-- CreateIndex
CREATE INDEX "DuesDiscount_memberId_idx" ON "DuesDiscount"("memberId");

-- CreateIndex
CREATE INDEX "DuesDiscount_discountType_idx" ON "DuesDiscount"("discountType");

-- CreateIndex
CREATE INDEX "PaymentAccount_stkId_idx" ON "PaymentAccount"("stkId");

-- CreateIndex
CREATE INDEX "PaymentAccount_isActive_idx" ON "PaymentAccount"("isActive");

-- CreateIndex
CREATE INDEX "Payment_stkId_idx" ON "Payment"("stkId");

-- CreateIndex
CREATE INDEX "Payment_memberId_idx" ON "Payment"("memberId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_type_idx" ON "Payment"("type");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

-- CreateIndex
CREATE INDEX "Payment_dueDate_idx" ON "Payment"("dueDate");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_stkId_idx" ON "AuditLog"("stkId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_name_key" ON "Sector"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_code_key" ON "Sector"("code");

-- CreateIndex
CREATE INDEX "UserInterest_userId_idx" ON "UserInterest"("userId");

-- CreateIndex
CREATE INDEX "UserInterest_sectorId_idx" ON "UserInterest"("sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInterest_userId_sectorId_key" ON "UserInterest"("userId", "sectorId");

-- CreateIndex
CREATE INDEX "SectorRegionalData_city_idx" ON "SectorRegionalData"("city");

-- CreateIndex
CREATE UNIQUE INDEX "SectorRegionalData_sectorId_cityCode_key" ON "SectorRegionalData"("sectorId", "cityCode");

-- CreateIndex
CREATE INDEX "STKSector_stkId_idx" ON "STKSector"("stkId");

-- CreateIndex
CREATE INDEX "STKSector_sectorId_idx" ON "STKSector"("sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "STKSector_stkId_sectorId_key" ON "STKSector"("stkId", "sectorId");

-- CreateIndex
CREATE INDEX "Competitor_stkId_idx" ON "Competitor"("stkId");

-- CreateIndex
CREATE INDEX "Competitor_sectorId_idx" ON "Competitor"("sectorId");

-- CreateIndex
CREATE INDEX "MonthlySnapshot_stkId_idx" ON "MonthlySnapshot"("stkId");

-- CreateIndex
CREATE INDEX "MonthlySnapshot_year_month_idx" ON "MonthlySnapshot"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySnapshot_stkId_year_month_key" ON "MonthlySnapshot"("stkId", "year", "month");

-- CreateIndex
CREATE INDEX "MessageCampaign_stkId_idx" ON "MessageCampaign"("stkId");

-- CreateIndex
CREATE INDEX "MessageCampaign_status_idx" ON "MessageCampaign"("status");

-- CreateIndex
CREATE INDEX "MessageCampaign_messageType_idx" ON "MessageCampaign"("messageType");

-- CreateIndex
CREATE INDEX "MessageRecipient_campaignId_idx" ON "MessageRecipient"("campaignId");

-- CreateIndex
CREATE INDEX "MessageRecipient_memberId_idx" ON "MessageRecipient"("memberId");

-- CreateIndex
CREATE INDEX "MemberNotification_stkId_idx" ON "MemberNotification"("stkId");

-- CreateIndex
CREATE INDEX "MemberNotification_memberId_idx" ON "MemberNotification"("memberId");

-- CreateIndex
CREATE INDEX "MemberNotification_isRead_idx" ON "MemberNotification"("isRead");

-- CreateIndex
CREATE INDEX "DomainRequest_stkId_idx" ON "DomainRequest"("stkId");

-- CreateIndex
CREATE INDEX "DomainRequest_status_idx" ON "DomainRequest"("status");

-- CreateIndex
CREATE INDEX "Document_stkId_idx" ON "Document"("stkId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "Document_isPublished_idx" ON "Document"("isPublished");

-- CreateIndex
CREATE INDEX "GeneralAssembly_stkId_idx" ON "GeneralAssembly"("stkId");

-- CreateIndex
CREATE INDEX "GeneralAssembly_assemblyDate_idx" ON "GeneralAssembly"("assemblyDate");

-- CreateIndex
CREATE INDEX "GeneralAssembly_status_idx" ON "GeneralAssembly"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralAssembly_stkId_assemblyNumber_key" ON "GeneralAssembly"("stkId", "assemblyNumber");

-- CreateIndex
CREATE INDEX "AssemblyAgendaItem_assemblyId_idx" ON "AssemblyAgendaItem"("assemblyId");

-- CreateIndex
CREATE INDEX "AssemblyAttendee_assemblyId_idx" ON "AssemblyAttendee"("assemblyId");

-- CreateIndex
CREATE INDEX "AssemblyAttendee_memberId_idx" ON "AssemblyAttendee"("memberId");

-- CreateIndex
CREATE INDEX "AssemblyAttendee_status_idx" ON "AssemblyAttendee"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AssemblyAttendee_assemblyId_memberId_key" ON "AssemblyAttendee"("assemblyId", "memberId");

-- CreateIndex
CREATE INDEX "AssemblyProxy_assemblyId_idx" ON "AssemblyProxy"("assemblyId");

-- CreateIndex
CREATE INDEX "AssemblyProxy_giverId_idx" ON "AssemblyProxy"("giverId");

-- CreateIndex
CREATE INDEX "AssemblyProxy_receiverId_idx" ON "AssemblyProxy"("receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "AssemblyProxy_assemblyId_giverId_key" ON "AssemblyProxy"("assemblyId", "giverId");

-- CreateIndex
CREATE INDEX "DocumentTemplate_stkId_idx" ON "DocumentTemplate"("stkId");

-- CreateIndex
CREATE INDEX "DocumentTemplate_category_idx" ON "DocumentTemplate"("category");

-- CreateIndex
CREATE INDEX "DocumentTemplate_isActive_idx" ON "DocumentTemplate"("isActive");

-- CreateIndex
CREATE INDEX "STKRole_stkId_idx" ON "STKRole"("stkId");

-- CreateIndex
CREATE UNIQUE INDEX "STKRole_stkId_name_key" ON "STKRole"("stkId", "name");

-- CreateIndex
CREATE INDEX "Archive_stkId_idx" ON "Archive"("stkId");

-- CreateIndex
CREATE INDEX "Archive_year_idx" ON "Archive"("year");

-- CreateIndex
CREATE INDEX "Archive_recordType_idx" ON "Archive"("recordType");

-- CreateIndex
CREATE INDEX "Archive_isLocked_idx" ON "Archive"("isLocked");

-- CreateIndex
CREATE UNIQUE INDEX "Archive_stkId_recordType_recordId_key" ON "Archive"("stkId", "recordType", "recordId");

-- CreateIndex
CREATE INDEX "ApplicationHistory_stkId_idx" ON "ApplicationHistory"("stkId");

-- CreateIndex
CREATE INDEX "ApplicationHistory_applicationId_idx" ON "ApplicationHistory"("applicationId");

-- CreateIndex
CREATE INDEX "ResignationHistory_stkId_idx" ON "ResignationHistory"("stkId");

-- CreateIndex
CREATE INDEX "ResignationHistory_memberId_idx" ON "ResignationHistory"("memberId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "STK" ADD CONSTRAINT "STK_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "STK" ADD CONSTRAINT "STK_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "STKApplication" ADD CONSTRAINT "STKApplication_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardMember" ADD CONSTRAINT "BoardMember_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardDecision" ADD CONSTRAINT "BoardDecision_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionMember" ADD CONSTRAINT "DecisionMember_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "BoardDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionMember" ADD CONSTRAINT "DecisionMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipApplication" ADD CONSTRAINT "MembershipApplication_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipApplication" ADD CONSTRAINT "MembershipApplication_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberNote" ADD CONSTRAINT "MemberNote_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuesPlan" ADD CONSTRAINT "DuesPlan_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuesDiscount" ADD CONSTRAINT "DuesDiscount_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAccount" ADD CONSTRAINT "PaymentAccount_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectorRegionalData" ADD CONSTRAINT "SectorRegionalData_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "STKSector" ADD CONSTRAINT "STKSector_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "STKSector" ADD CONSTRAINT "STKSector_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlySnapshot" ADD CONSTRAINT "MonthlySnapshot_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageCampaign" ADD CONSTRAINT "MessageCampaign_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageCampaign" ADD CONSTRAINT "MessageCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageRecipient" ADD CONSTRAINT "MessageRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MessageCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberNotification" ADD CONSTRAINT "MemberNotification_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainRequest" ADD CONSTRAINT "DomainRequest_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralAssembly" ADD CONSTRAINT "GeneralAssembly_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblyAgendaItem" ADD CONSTRAINT "AssemblyAgendaItem_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "GeneralAssembly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblyAttendee" ADD CONSTRAINT "AssemblyAttendee_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "GeneralAssembly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblyProxy" ADD CONSTRAINT "AssemblyProxy_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "GeneralAssembly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "STKRole" ADD CONSTRAINT "STKRole_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Archive" ADD CONSTRAINT "Archive_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationHistory" ADD CONSTRAINT "ApplicationHistory_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationHistory" ADD CONSTRAINT "ApplicationHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MembershipApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResignationHistory" ADD CONSTRAINT "ResignationHistory_stkId_fkey" FOREIGN KEY ("stkId") REFERENCES "STK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResignationHistory" ADD CONSTRAINT "ResignationHistory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
