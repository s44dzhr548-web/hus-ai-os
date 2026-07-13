CREATE TABLE "marketing_settings" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "default_daily_budget" DECIMAL(65,30) NOT NULL DEFAULT 500,
    "default_weekly_budget" DECIMAL(65,30) NOT NULL DEFAULT 3500,
    "default_monthly_budget" DECIMAL(65,30) NOT NULL DEFAULT 15000,
    "reserve_percent" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "profit_margin" DOUBLE PRECISION NOT NULL DEFAULT 32,
    "average_order_value" DECIMAL(65,30) NOT NULL DEFAULT 120,
    "target_cpa" DECIMAL(65,30),
    "target_roas" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "config_json" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "marketing_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "marketing_settings_restaurant_id_key" ON "marketing_settings"("restaurant_id");
ALTER TABLE "marketing_settings" ADD CONSTRAINT "marketing_settings_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
