-- Phase 2 Command Center
ALTER TYPE "MarketingProviderCategory" ADD VALUE IF NOT EXISTS 'COPY';

CREATE TABLE "marketing_automation_rules" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "rule_type" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "config_json" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "marketing_automation_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_journey_metrics" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "data_source" TEXT NOT NULL DEFAULT 'simulation',
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_journey_metrics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_command_snapshots" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "metrics_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_command_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "marketing_automation_rules_restaurant_id_is_enabled_idx" ON "marketing_automation_rules"("restaurant_id", "is_enabled");
CREATE INDEX "marketing_journey_metrics_restaurant_id_stage_idx" ON "marketing_journey_metrics"("restaurant_id", "stage");
CREATE INDEX "marketing_command_snapshots_restaurant_id_period_created_at_idx" ON "marketing_command_snapshots"("restaurant_id", "period", "created_at");

ALTER TABLE "marketing_automation_rules" ADD CONSTRAINT "marketing_automation_rules_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_journey_metrics" ADD CONSTRAINT "marketing_journey_metrics_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_command_snapshots" ADD CONSTRAINT "marketing_command_snapshots_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
