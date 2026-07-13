-- After-visit WhatsApp automation (additive only)

CREATE TYPE "WhatsAppDeliveryStatus" AS ENUM (
  'QUEUED',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
  'OPTED_OUT',
  'SKIPPED_NO_CONSENT',
  'SKIPPED_NO_PHONE',
  'SKIPPED_NO_CONNECTION',
  'SKIPPED_DISABLED',
  'SKIPPED_DUPLICATE'
);

CREATE TABLE IF NOT EXISTS "whatsapp_business_connections" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "phone_number_id" TEXT NOT NULL,
  "waba_id" TEXT,
  "business_phone" TEXT,
  "access_token_enc" TEXT NOT NULL,
  "template_name" TEXT NOT NULL DEFAULT 'after_visit_thank_you',
  "template_language" TEXT NOT NULL DEFAULT 'ar',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "connected_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_business_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_business_connections_restaurant_id_key"
  ON "whatsapp_business_connections"("restaurant_id");

CREATE TABLE IF NOT EXISTS "after_visit_whatsapp_automation" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "branch_id" TEXT,
  "is_enabled" BOOLEAN NOT NULL DEFAULT false,
  "delay_minutes" INTEGER NOT NULL DEFAULT 5,
  "template_name" TEXT NOT NULL DEFAULT 'after_visit_thank_you',
  "message_body" TEXT,
  "review_link_base" TEXT,
  "test_phone" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "after_visit_whatsapp_automation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "after_visit_whatsapp_automation_restaurant_id_key"
  ON "after_visit_whatsapp_automation"("restaurant_id");

CREATE TABLE IF NOT EXISTS "whatsapp_message_deliveries" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "customer_profile_id" TEXT,
  "visit_id" TEXT NOT NULL,
  "session_id" TEXT,
  "phone" TEXT NOT NULL,
  "template_name" TEXT NOT NULL,
  "status" "WhatsAppDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  "event_type" TEXT NOT NULL DEFAULT 'SESSION_COMPLETED',
  "review_url" TEXT,
  "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scheduled_for" TIMESTAMP(3) NOT NULL,
  "sent_at" TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "read_at" TIMESTAMP(3),
  "failed_reason" TEXT,
  "provider_message_id" TEXT,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_message_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_message_deliveries_visit_id_key"
  ON "whatsapp_message_deliveries"("visit_id");

CREATE INDEX IF NOT EXISTS "whatsapp_message_deliveries_restaurant_id_status_scheduled_for_idx"
  ON "whatsapp_message_deliveries"("restaurant_id", "status", "scheduled_for");

CREATE INDEX IF NOT EXISTS "whatsapp_message_deliveries_session_id_idx"
  ON "whatsapp_message_deliveries"("session_id");

ALTER TABLE "whatsapp_business_connections"
  ADD CONSTRAINT "whatsapp_business_connections_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "after_visit_whatsapp_automation"
  ADD CONSTRAINT "after_visit_whatsapp_automation_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "after_visit_whatsapp_automation"
  ADD CONSTRAINT "after_visit_whatsapp_automation_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "whatsapp_message_deliveries"
  ADD CONSTRAINT "whatsapp_message_deliveries_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "whatsapp_message_deliveries"
  ADD CONSTRAINT "whatsapp_message_deliveries_customer_profile_id_fkey"
  FOREIGN KEY ("customer_profile_id") REFERENCES "customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "whatsapp_message_deliveries"
  ADD CONSTRAINT "whatsapp_message_deliveries_visit_id_fkey"
  FOREIGN KEY ("visit_id") REFERENCES "customer_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
