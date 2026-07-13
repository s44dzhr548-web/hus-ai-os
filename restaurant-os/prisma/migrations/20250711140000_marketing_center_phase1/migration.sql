-- AI Marketing Center Phase 1 — architecture tables only (additive, safe)

CREATE TYPE "MarketingGoalType" AS ENUM ('INCREASE_SALES', 'INCREASE_RESERVATIONS', 'INCREASE_WALKINS', 'INCREASE_DELIVERY', 'INCREASE_RETURNING', 'INCREASE_WHATSAPP', 'INCREASE_REVIEWS', 'INCREASE_FOLLOWERS');
CREATE TYPE "MarketingPlatformStatus" AS ENUM ('NOT_CONNECTED', 'COMING_SOON');

CREATE TABLE "marketing_budgets" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "daily_budget" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "weekly_budget" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "monthly_budget" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "distribution_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "marketing_budgets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_recommendations" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title_ar" TEXT NOT NULL,
    "title_en" TEXT,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_goals" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "goal_type" "MarketingGoalType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_goals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_platforms" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "platform_key" TEXT NOT NULL,
    "label_ar" TEXT NOT NULL,
    "status" "MarketingPlatformStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
    "budget_allocated" DECIMAL(65,30) DEFAULT 0,
    "spent" DECIMAL(65,30) DEFAULT 0,
    "expected_customers" INTEGER,
    "expected_reservations" INTEGER,
    "expected_revenue" DECIMAL(65,30),
    "expected_roi" DOUBLE PRECISION,
    "expected_profit" DECIMAL(65,30),
    "confidence_score" DOUBLE PRECISION,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "marketing_platforms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_decisions" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "from_platform" TEXT NOT NULL,
    "to_platform" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "expected_profit_pct" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_decisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_analytics" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "ctr" DOUBLE PRECISION,
    "cpc" DOUBLE PRECISION,
    "cpa" DOUBLE PRECISION,
    "roas" DOUBLE PRECISION,
    "roi" DOUBLE PRECISION,
    "reservations" INTEGER,
    "orders" INTEGER,
    "customers" INTEGER,
    "revenue" DECIMAL(65,30),
    "profit" DECIMAL(65,30),
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_analytics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_simulations" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "input_budget" DECIMAL(65,30) NOT NULL,
    "results_json" JSONB NOT NULL,
    "expected_revenue" DECIMAL(65,30),
    "expected_profit" DECIMAL(65,30),
    "expected_roi" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_simulations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketing_reports" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "marketing_budgets_restaurant_id_idx" ON "marketing_budgets"("restaurant_id");
CREATE INDEX "marketing_recommendations_restaurant_id_is_active_idx" ON "marketing_recommendations"("restaurant_id", "is_active");
CREATE UNIQUE INDEX "marketing_goals_restaurant_id_goal_type_key" ON "marketing_goals"("restaurant_id", "goal_type");
CREATE UNIQUE INDEX "marketing_platforms_restaurant_id_platform_key_key" ON "marketing_platforms"("restaurant_id", "platform_key");
CREATE INDEX "marketing_decisions_restaurant_id_created_at_idx" ON "marketing_decisions"("restaurant_id", "created_at");
CREATE INDEX "marketing_analytics_restaurant_id_captured_at_idx" ON "marketing_analytics"("restaurant_id", "captured_at");
CREATE INDEX "marketing_simulations_restaurant_id_created_at_idx" ON "marketing_simulations"("restaurant_id", "created_at");
CREATE INDEX "marketing_reports_restaurant_id_created_at_idx" ON "marketing_reports"("restaurant_id", "created_at");

ALTER TABLE "marketing_budgets" ADD CONSTRAINT "marketing_budgets_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_recommendations" ADD CONSTRAINT "marketing_recommendations_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_goals" ADD CONSTRAINT "marketing_goals_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_platforms" ADD CONSTRAINT "marketing_platforms_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_decisions" ADD CONSTRAINT "marketing_decisions_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_analytics" ADD CONSTRAINT "marketing_analytics_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_simulations" ADD CONSTRAINT "marketing_simulations_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_reports" ADD CONSTRAINT "marketing_reports_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
