-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FUNDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CrisisType" AS ENUM ('CONFLICT', 'FAMINE', 'DROUGHT', 'EARTHQUAKE', 'FLOOD', 'STORM', 'DISPLACEMENT', 'DISEASE', 'PERSECUTION', 'OTHER');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('CRITICAL', 'HIGH', 'NORMAL');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('CARITAS_NATIONAL', 'DIOCESE', 'RELIGIOUS_ORDER', 'PARISH', 'NGO');

-- CreateEnum
CREATE TYPE "DonationType" AS ENUM ('ONE_TIME', 'RECURRING');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "DisbursementStatus" AS ENUM ('PLANNED', 'SENT', 'CONFIRMED', 'REPORTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RECEIPT', 'INVOICE', 'FIELD_REPORT', 'PHOTO', 'AUDIT', 'AGREEMENT');

-- CreateEnum
CREATE TYPE "FeedSource" AS ENUM ('RELIEFWEB', 'VATICAN_NEWS', 'CARITAS', 'EDITORIAL');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'FINANCE', 'EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "story" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "urgency" "Urgency" NOT NULL DEFAULT 'NORMAL',
    "crisisType" "CrisisType" NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "countryCode" CHAR(2) NOT NULL,
    "countryName" TEXT NOT NULL,
    "region" TEXT,
    "goalCents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "coverImageUrl" TEXT,
    "coverImageAlt" TEXT,
    "reliefwebDisasterId" TEXT,
    "partnerId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "countryName" TEXT NOT NULL,
    "description" TEXT,
    "websiteUrl" TEXT,
    "logoUrl" TEXT,
    "registrationNumber" TEXT,
    "vettedAt" TIMESTAMP(3),
    "vettingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isOverhead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AllocationCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAllocation" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "plannedPercent" INTEGER NOT NULL,

    CONSTRAINT "CampaignAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donor" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "stripeCustomerId" TEXT,
    "taxCountry" CHAR(2),
    "giftAidDeclared" BOOLEAN NOT NULL DEFAULT false,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "campaignId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "netCents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "feeCovered" BOOLEAN NOT NULL DEFAULT false,
    "type" "DonationType" NOT NULL DEFAULT 'ONE_TIME',
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeChargeId" TEXT,
    "publicRef" TEXT NOT NULL,
    "message" TEXT,
    "intention" TEXT,
    "inMemoryOf" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "refundedAt" TIMESTAMP(3),

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disbursement" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "DisbursementStatus" NOT NULL DEFAULT 'PLANNED',
    "reference" TEXT,
    "description" TEXT NOT NULL,
    "disbursedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correctsId" TEXT,

    CONSTRAINT "Disbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisbursementDocument" (
    "id" TEXT NOT NULL,
    "disbursementId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSizeBytes" INTEGER,
    "mimeType" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisbursementDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactMetric" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "disbursementId" TEXT,
    "label" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImpactMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignFinancials" (
    "campaignId" TEXT NOT NULL,
    "raisedCents" BIGINT NOT NULL DEFAULT 0,
    "disbursedCents" BIGINT NOT NULL DEFAULT 0,
    "overheadCents" BIGINT NOT NULL DEFAULT 0,
    "donationCount" INTEGER NOT NULL DEFAULT 0,
    "recurringCount" INTEGER NOT NULL DEFAULT 0,
    "recomputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignFinancials_pkey" PRIMARY KEY ("campaignId")
);

-- CreateTable
CREATE TABLE "CrisisFeedItem" (
    "id" TEXT NOT NULL,
    "source" "FeedSource" NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "summary" TEXT,
    "imageUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "countryCodes" TEXT[],
    "disasterTypes" TEXT[],
    "reviewedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "promotedToPostId" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrisisFeedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "coverImageUrl" TEXT,
    "coverImageAlt" TEXT,
    "source" "FeedSource" NOT NULL DEFAULT 'EDITORIAL',
    "sourceUrl" TEXT,
    "sourceName" TEXT,
    "authorId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT,

    CONSTRAINT "NewsPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrayerIntention" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "name" TEXT,
    "text" TEXT NOT NULL,
    "prayerCount" INTEGER NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrayerIntention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");

-- CreateIndex
CREATE INDEX "Campaign_status_urgency_idx" ON "Campaign"("status", "urgency");

-- CreateIndex
CREATE INDEX "Campaign_countryCode_idx" ON "Campaign"("countryCode");

-- CreateIndex
CREATE INDEX "Campaign_crisisType_idx" ON "Campaign"("crisisType");

-- CreateIndex
CREATE INDEX "Campaign_reliefwebDisasterId_idx" ON "Campaign"("reliefwebDisasterId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_slug_key" ON "Partner"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AllocationCategory_slug_key" ON "AllocationCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignAllocation_campaignId_categoryId_key" ON "CampaignAllocation"("campaignId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Donor_email_key" ON "Donor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Donor_stripeCustomerId_key" ON "Donor"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Donor_stripeCustomerId_idx" ON "Donor"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_stripePaymentIntentId_key" ON "Donation"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_publicRef_key" ON "Donation"("publicRef");

-- CreateIndex
CREATE INDEX "Donation_campaignId_status_idx" ON "Donation"("campaignId", "status");

-- CreateIndex
CREATE INDEX "Donation_donorId_idx" ON "Donation"("donorId");

-- CreateIndex
CREATE INDEX "Donation_createdAt_idx" ON "Donation"("createdAt");

-- CreateIndex
CREATE INDEX "Donation_stripeSubscriptionId_idx" ON "Donation"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Disbursement_campaignId_status_idx" ON "Disbursement"("campaignId", "status");

-- CreateIndex
CREATE INDEX "Disbursement_partnerId_idx" ON "Disbursement"("partnerId");

-- CreateIndex
CREATE INDEX "Disbursement_disbursedAt_idx" ON "Disbursement"("disbursedAt");

-- CreateIndex
CREATE INDEX "DisbursementDocument_disbursementId_idx" ON "DisbursementDocument"("disbursementId");

-- CreateIndex
CREATE INDEX "ImpactMetric_campaignId_idx" ON "ImpactMetric"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CrisisFeedItem_promotedToPostId_key" ON "CrisisFeedItem"("promotedToPostId");

-- CreateIndex
CREATE INDEX "CrisisFeedItem_publishedAt_idx" ON "CrisisFeedItem"("publishedAt");

-- CreateIndex
CREATE INDEX "CrisisFeedItem_reviewedAt_idx" ON "CrisisFeedItem"("reviewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CrisisFeedItem_source_externalId_key" ON "CrisisFeedItem"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsPost_slug_key" ON "NewsPost"("slug");

-- CreateIndex
CREATE INDEX "NewsPost_status_publishedAt_idx" ON "NewsPost"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "NewsPost_campaignId_idx" ON "NewsPost"("campaignId");

-- CreateIndex
CREATE INDEX "PrayerIntention_campaignId_approvedAt_idx" ON "PrayerIntention"("campaignId", "approvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAllocation" ADD CONSTRAINT "CampaignAllocation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAllocation" ADD CONSTRAINT "CampaignAllocation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AllocationCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_correctsId_fkey" FOREIGN KEY ("correctsId") REFERENCES "Disbursement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AllocationCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisbursementDocument" ADD CONSTRAINT "DisbursementDocument_disbursementId_fkey" FOREIGN KEY ("disbursementId") REFERENCES "Disbursement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactMetric" ADD CONSTRAINT "ImpactMetric_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactMetric" ADD CONSTRAINT "ImpactMetric_disbursementId_fkey" FOREIGN KEY ("disbursementId") REFERENCES "Disbursement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignFinancials" ADD CONSTRAINT "CampaignFinancials_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrisisFeedItem" ADD CONSTRAINT "CrisisFeedItem_promotedToPostId_fkey" FOREIGN KEY ("promotedToPostId") REFERENCES "NewsPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsPost" ADD CONSTRAINT "NewsPost_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsPost" ADD CONSTRAINT "NewsPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerIntention" ADD CONSTRAINT "PrayerIntention_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
