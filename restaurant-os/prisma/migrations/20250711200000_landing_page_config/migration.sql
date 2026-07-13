-- Landing page video settings & popup banner (additive, per-restaurant)
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "landing_page_config" JSONB;
