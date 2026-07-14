-- Enterprise ad platform integrations (additive only)
ALTER TYPE "MarketingPlatform" ADD VALUE 'LINKEDIN';
ALTER TYPE "MarketingPlatform" ADD VALUE 'PINTEREST';

ALTER TABLE "marketing_ad_connections" ADD COLUMN IF NOT EXISTS "business_name" TEXT;
ALTER TABLE "marketing_ad_connections" ADD COLUMN IF NOT EXISTS "currency" TEXT;
ALTER TABLE "marketing_ad_connections" ADD COLUMN IF NOT EXISTS "timezone" TEXT;
ALTER TABLE "marketing_ad_connections" ADD COLUMN IF NOT EXISTS "sync_status" TEXT NOT NULL DEFAULT 'IDLE';
ALTER TABLE "marketing_ad_connections" ADD COLUMN IF NOT EXISTS "last_sync_at" TIMESTAMP(3);
ALTER TABLE "marketing_ad_connections" ADD COLUMN IF NOT EXISTS "metadata_json" JSONB;

CREATE TABLE IF NOT EXISTS "platform_ads_integrations" (
    "id" TEXT NOT NULL,
    "platform_key" TEXT NOT NULL,
    "display_name" TEXT,
    "client_id" TEXT,
    "client_secret_enc" TEXT,
    "redirect_uri_override" TEXT,
    "webhook_url_override" TEXT,
    "webhook_verify_token_enc" TEXT,
    "oauth_scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "extra_config_json" JSONB,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_user_id" TEXT,
    CONSTRAINT "platform_ads_integrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_ads_integrations_platform_key_key" ON "platform_ads_integrations"("platform_key");

CREATE TABLE IF NOT EXISTS "marketing_ad_entities" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "platform" "MarketingPlatform" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT,
    "spend" DECIMAL(65,30) DEFAULT 0,
    "reach" INTEGER,
    "impressions" INTEGER,
    "clicks" INTEGER,
    "conversions" INTEGER,
    "roas" DECIMAL(65,30),
    "raw_json" JSONB,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "marketing_ad_entities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "marketing_ad_entities_restaurant_id_platform_entity_type_external_id_key"
    ON "marketing_ad_entities"("restaurant_id", "platform", "entity_type", "external_id");
CREATE INDEX IF NOT EXISTS "marketing_ad_entities_restaurant_id_platform_idx"
    ON "marketing_ad_entities"("restaurant_id", "platform");

ALTER TABLE "marketing_ad_entities" ADD CONSTRAINT "marketing_ad_entities_restaurant_id_fkey"
    FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "marketing_ad_sync_logs" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT,
    "platform" TEXT,
    "kind" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_ad_sync_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "marketing_ad_sync_logs_restaurant_id_created_at_idx"
    ON "marketing_ad_sync_logs"("restaurant_id", "created_at");
