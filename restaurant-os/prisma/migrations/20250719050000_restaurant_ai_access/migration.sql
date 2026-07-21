-- Restaurant-level AI Access (additive — Fabrika seed only inserts config row)

CREATE TABLE "restaurant_ai_access" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "enabled_roles" JSONB NOT NULL DEFAULT '[]',
    "daily_request_limit" INTEGER NOT NULL DEFAULT 200,
    "monthly_request_limit" INTEGER NOT NULL DEFAULT 3000,
    "monthly_cost_limit_sar" DECIMAL(10,2) NOT NULL DEFAULT 500,
    "service_paused" BOOLEAN NOT NULL DEFAULT false,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_ai_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "restaurant_ai_access_restaurant_id_key"
ON "restaurant_ai_access"("restaurant_id");

ALTER TABLE "restaurant_ai_access"
ADD CONSTRAINT "restaurant_ai_access_restaurant_id_fkey"
FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "restaurant_ai_usage_logs" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "estimated_cost_sar" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurant_ai_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "restaurant_ai_usage_logs_restaurant_id_created_at_idx"
ON "restaurant_ai_usage_logs"("restaurant_id", "created_at");

ALTER TABLE "restaurant_ai_usage_logs"
ADD CONSTRAINT "restaurant_ai_usage_logs_restaurant_id_fkey"
FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Fabrika Lounge: enable 4 services (not Platform Engineer)
INSERT INTO "restaurant_ai_access" (
    "id",
    "restaurant_id",
    "enabled_roles",
    "daily_request_limit",
    "monthly_request_limit",
    "monthly_cost_limit_sar",
    "service_paused",
    "created_at",
    "updated_at"
)
SELECT
    'ra_' || r.id,
    r.id,
    '["MENU_OS_ASSISTANT","MARKETING_MANAGER","AD_COPYWRITER","DATA_ANALYST"]'::jsonb,
    200,
    3000,
    500.00,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "restaurants" r
WHERE r.slug = 'fabrika-mqkat9dw'
ON CONFLICT ("restaurant_id") DO NOTHING;
