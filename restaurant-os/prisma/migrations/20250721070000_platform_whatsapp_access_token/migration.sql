-- Platform-level WhatsApp Cloud API access token (encrypted at rest)
ALTER TABLE "platform_meta_config" ADD COLUMN IF NOT EXISTS "whatsapp_access_token_enc" TEXT;
