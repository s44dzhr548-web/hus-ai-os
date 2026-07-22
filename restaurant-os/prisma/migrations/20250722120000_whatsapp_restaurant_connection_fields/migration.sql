-- Restaurant-level WhatsApp connection metadata (platform token used for API calls)
ALTER TABLE "whatsapp_business_connections" ADD COLUMN IF NOT EXISTS "meta_business_id" TEXT;
ALTER TABLE "whatsapp_business_connections" ADD COLUMN IF NOT EXISTS "connection_status" TEXT NOT NULL DEFAULT 'NOT_CONNECTED';
ALTER TABLE "whatsapp_business_connections" ALTER COLUMN "access_token_enc" DROP NOT NULL;
