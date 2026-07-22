-- Platform Meta Business Portfolio ID for WABA discovery (additive)
ALTER TABLE "platform_meta_config" ADD COLUMN IF NOT EXISTS "meta_business_id" TEXT;
