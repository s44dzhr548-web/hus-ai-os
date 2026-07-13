-- Marketing AI module — additive migration only (safe for Fabrika production)
-- Adds MARKETING staff role, marketing consent column, and new marketing tables.

-- AlterEnum: add MARKETING to StaffRole
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'MARKETING';

-- CustomerProfile: optional marketing consent (default false — no existing data changed)
ALTER TABLE "customer_profiles" ADD COLUMN IF NOT EXISTS "marketing_consent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customer_profiles" ADD COLUMN IF NOT EXISTS "marketing_consent_at" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "MarketingCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'ARCHIVED', 'COMPLETED');
CREATE TYPE "MarketingPlatform" AS ENUM ('META', 'INSTAGRAM', 'FACEBOOK', 'MESSENGER', 'TIKTOK', 'SNAPCHAT', 'GOOGLE', 'YOUTUBE', 'X');
CREATE TYPE "MarketingCreativeType" AS ENUM ('FOOD_IMAGE', 'POSTER', 'STORY', 'INSTAGRAM_POST', 'TIKTOK_COVER', 'FACEBOOK_AD', 'SNAPCHAT_AD', 'FLYER', 'SEASONAL_RAMADAN', 'SEASONAL_EID', 'SEASONAL_NATIONAL_DAY', 'SEASONAL_SUMMER', 'SEASONAL_WINTER', 'VIDEO_15S', 'VIDEO_30S', 'VIDEO_60S', 'VIDEO_REEL', 'VIDEO_TIKTOK', 'VIDEO_SNAP_STORY', 'VIDEO_INTRO', 'MENU_VIDEO');
CREATE TYPE "MarketingCampaignGoal" AS ENUM ('INCREASE_SALES', 'INCREASE_RESERVATIONS', 'INCREASE_WHATSAPP', 'PROMOTE_OFFER', 'PROMOTE_NEW_MENU', 'PROMOTE_EVENT', 'INCREASE_FOLLOWERS');
CREATE TYPE "MarketingWhatsAppType" AS ENUM ('OFFER', 'COUPON', 'EVENT', 'BIRTHDAY', 'RESERVATION', 'ANNOUNCEMENT');
CREATE TYPE "MarketingSegment" AS ENUM ('VIP', 'RETURNING', 'INACTIVE', 'BIRTHDAY', 'FAMILIES', 'BREAKFAST', 'LUNCH', 'DINNER', 'COFFEE', 'CORPORATE');

-- CreateTable
CREATE TABLE "marketing_ad_connections" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "platform" "MarketingPlatform" NOT NULL,
    "account_id" TEXT,
    "account_name" TEXT,
    "access_token_enc" TEXT,
    "refresh_token_enc" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "connected_at" TIMESTAMP(3),
    "connected_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "marketing_ad_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_campaigns" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" "MarketingCampaignGoal" NOT NULL,
    "status" "MarketingCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "platform" "MarketingPlatform",
    "budget" DECIMAL(65,30) DEFAULT 0,
    "spent" DECIMAL(65,30) DEFAULT 0,
    "schedule_start" TIMESTAMP(3),
    "schedule_end" TIMESTAMP(3),
    "audience_json" JSONB,
    "locations_json" JSONB,
    "age_min" INTEGER,
    "age_max" INTEGER,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "radius_km" DOUBLE PRECISION,
    "headline" TEXT,
    "primary_text" TEXT,
    "cta" TEXT,
    "copy_ar" TEXT,
    "copy_en" TEXT,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "captions" TEXT,
    "ai_score" DOUBLE PRECISION,
    "external_id" TEXT,
    "created_by_user_id" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_creatives" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "type" "MarketingCreativeType" NOT NULL,
    "title" TEXT,
    "prompt" TEXT,
    "asset_url" TEXT,
    "metadata_json" JSONB,
    "season" TEXT,
    "duration_sec" INTEGER,
    "voice_over" TEXT,
    "subtitles" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_creatives_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_metrics_snapshots" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ctr" DOUBLE PRECISION,
    "cpc" DOUBLE PRECISION,
    "cpm" DOUBLE PRECISION,
    "reach" INTEGER,
    "frequency" DOUBLE PRECISION,
    "conversions" INTEGER,
    "reservations" INTEGER,
    "orders" INTEGER,
    "whatsapp_clicks" INTEGER,
    "phone_calls" INTEGER,
    "roas" DOUBLE PRECISION,
    "roi" DOUBLE PRECISION,
    "spend" DECIMAL(65,30) DEFAULT 0,
    "revenue" DECIMAL(65,30) DEFAULT 0,
    CONSTRAINT "marketing_metrics_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_ai_recommendations" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "payload_json" JSONB,
    "is_applied" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_ai_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_chat_messages" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_whatsapp_campaigns" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "type" "MarketingWhatsAppType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "segment" "MarketingSegment",
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_whatsapp_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_audit_logs" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "details_json" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_events" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketing_ad_connections_restaurant_id_platform_key" ON "marketing_ad_connections"("restaurant_id", "platform");
CREATE INDEX "marketing_campaigns_restaurant_id_status_idx" ON "marketing_campaigns"("restaurant_id", "status");
CREATE INDEX "marketing_campaigns_restaurant_id_created_at_idx" ON "marketing_campaigns"("restaurant_id", "created_at");
CREATE INDEX "marketing_creatives_restaurant_id_type_idx" ON "marketing_creatives"("restaurant_id", "type");
CREATE INDEX "marketing_metrics_snapshots_restaurant_id_captured_at_idx" ON "marketing_metrics_snapshots"("restaurant_id", "captured_at");
CREATE INDEX "marketing_metrics_snapshots_campaign_id_captured_at_idx" ON "marketing_metrics_snapshots"("campaign_id", "captured_at");
CREATE INDEX "marketing_ai_recommendations_restaurant_id_created_at_idx" ON "marketing_ai_recommendations"("restaurant_id", "created_at");
CREATE INDEX "marketing_chat_messages_restaurant_id_created_at_idx" ON "marketing_chat_messages"("restaurant_id", "created_at");
CREATE INDEX "marketing_whatsapp_campaigns_restaurant_id_status_idx" ON "marketing_whatsapp_campaigns"("restaurant_id", "status");
CREATE INDEX "marketing_audit_logs_restaurant_id_created_at_idx" ON "marketing_audit_logs"("restaurant_id", "created_at");
CREATE INDEX "marketing_events_restaurant_id_event_type_created_at_idx" ON "marketing_events"("restaurant_id", "event_type", "created_at");

-- AddForeignKey
ALTER TABLE "marketing_ad_connections" ADD CONSTRAINT "marketing_ad_connections_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_creatives" ADD CONSTRAINT "marketing_creatives_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_creatives" ADD CONSTRAINT "marketing_creatives_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "marketing_metrics_snapshots" ADD CONSTRAINT "marketing_metrics_snapshots_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_metrics_snapshots" ADD CONSTRAINT "marketing_metrics_snapshots_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "marketing_ai_recommendations" ADD CONSTRAINT "marketing_ai_recommendations_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_ai_recommendations" ADD CONSTRAINT "marketing_ai_recommendations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "marketing_chat_messages" ADD CONSTRAINT "marketing_chat_messages_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_whatsapp_campaigns" ADD CONSTRAINT "marketing_whatsapp_campaigns_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_audit_logs" ADD CONSTRAINT "marketing_audit_logs_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_events" ADD CONSTRAINT "marketing_events_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
