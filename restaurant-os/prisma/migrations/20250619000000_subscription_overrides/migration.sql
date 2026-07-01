-- Add subscription limit overrides for platform admin
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "limit_overrides" JSONB;
