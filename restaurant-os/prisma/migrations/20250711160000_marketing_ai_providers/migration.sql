-- CreateEnum
CREATE TYPE "MarketingProviderCategory" AS ENUM ('BRAIN', 'IMAGE', 'VIDEO', 'AUDIO');
CREATE TYPE "MarketingProviderConnectionMethod" AS ENUM ('OAUTH', 'API_KEY');
CREATE TYPE "MarketingProviderStatus" AS ENUM ('DISCONNECTED', 'CONNECTED', 'NEEDS_RECONNECT', 'INVALID_KEY', 'EXPIRED', 'HEALTHY');

-- CreateTable
CREATE TABLE "marketing_ai_provider_connections" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "category" "MarketingProviderCategory" NOT NULL,
    "provider_key" TEXT NOT NULL,
    "connection_method" "MarketingProviderConnectionMethod",
    "api_key_enc" TEXT,
    "org_id" TEXT,
    "project_id" TEXT,
    "endpoint_url" TEXT,
    "model_id" TEXT,
    "access_token_enc" TEXT,
    "refresh_token_enc" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "status" "MarketingProviderStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_backup" BOOLEAN NOT NULL DEFAULT false,
    "role_assignment" TEXT,
    "task_assignment" TEXT,
    "account_name" TEXT,
    "account_id_masked" TEXT,
    "permissions_json" JSONB,
    "last_success_at" TIMESTAMP(3),
    "last_error" TEXT,
    "last_error_at" TIMESTAMP(3),
    "last_sync_at" TIMESTAMP(3),
    "usage_estimate_json" JSONB,
    "cost_estimate_json" JSONB,
    "connected_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_ai_provider_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_provider_routing" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "rules_json" JSONB NOT NULL,
    "auto_select" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_provider_routing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_ai_cost_settings" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "daily_budget" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "monthly_budget" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "max_cost_per_image" DECIMAL(65,30),
    "max_cost_per_video" DECIMAL(65,30),
    "max_daily_ai_cost" DECIMAL(65,30),
    "max_monthly_ai_cost" DECIMAL(65,30),
    "require_approval_above" DECIMAL(65,30),
    "hard_spending_limit" DECIMAL(65,30),
    "alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_ai_cost_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_ai_usage_logs" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "provider_key" TEXT NOT NULL,
    "category" "MarketingProviderCategory" NOT NULL,
    "usage_type" TEXT NOT NULL,
    "cost_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "metadata_json" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_ai_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "marketing_ai_provider_connections_restaurant_id_category_provider_key_key" ON "marketing_ai_provider_connections"("restaurant_id", "category", "provider_key");
CREATE INDEX "marketing_ai_provider_connections_restaurant_id_category_idx" ON "marketing_ai_provider_connections"("restaurant_id", "category");
CREATE UNIQUE INDEX "marketing_provider_routing_restaurant_id_key" ON "marketing_provider_routing"("restaurant_id");
CREATE UNIQUE INDEX "marketing_ai_cost_settings_restaurant_id_key" ON "marketing_ai_cost_settings"("restaurant_id");
CREATE INDEX "marketing_ai_usage_logs_restaurant_id_created_at_idx" ON "marketing_ai_usage_logs"("restaurant_id", "created_at");

ALTER TABLE "marketing_ai_provider_connections" ADD CONSTRAINT "marketing_ai_provider_connections_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_provider_routing" ADD CONSTRAINT "marketing_provider_routing_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_ai_cost_settings" ADD CONSTRAINT "marketing_ai_cost_settings_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_ai_usage_logs" ADD CONSTRAINT "marketing_ai_usage_logs_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
