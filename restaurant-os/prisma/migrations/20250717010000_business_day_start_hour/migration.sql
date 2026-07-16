-- Additive: restaurant operational business day start hour (default 4 AM)
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "business_day_start_hour" INTEGER NOT NULL DEFAULT 4;
