-- Table Gifts settings (additive only)
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "table_gifts_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "table_gifts_settings_json" JSONB;
