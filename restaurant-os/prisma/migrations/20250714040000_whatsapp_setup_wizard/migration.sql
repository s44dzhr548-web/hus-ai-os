-- WhatsApp setup wizard (additive — new tables only)

CREATE TABLE IF NOT EXISTS "whatsapp_business_profiles" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "business_name" TEXT,
  "verify_token_enc" TEXT,
  "webhook_verified_at" TIMESTAMP(3),
  "oauth_connected_at" TIMESTAMP(3),
  "feature_after_visit" BOOLEAN NOT NULL DEFAULT true,
  "feature_reservation" BOOLEAN NOT NULL DEFAULT false,
  "feature_gift" BOOLEAN NOT NULL DEFAULT false,
  "feature_order" BOOLEAN NOT NULL DEFAULT false,
  "feature_review" BOOLEAN NOT NULL DEFAULT true,
  "last_health_check_at" TIMESTAMP(3),
  "last_health_ok" BOOLEAN,
  "health_issues" JSONB,
  "wizard_completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_business_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_business_profiles_restaurant_id_key"
  ON "whatsapp_business_profiles"("restaurant_id");

CREATE TABLE IF NOT EXISTS "whatsapp_wizard_sessions" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "step" INTEGER NOT NULL DEFAULT 1,
  "access_token_enc" TEXT,
  "discovered_json" JSONB,
  "selected_waba_id" TEXT,
  "selected_phone_number_id" TEXT,
  "selected_business_name" TEXT,
  "selected_display_phone" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_wizard_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_wizard_sessions_restaurant_id_key"
  ON "whatsapp_wizard_sessions"("restaurant_id");

CREATE TABLE IF NOT EXISTS "whatsapp_owner_notifications" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "title_ar" TEXT NOT NULL,
  "message_ar" TEXT NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_owner_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "whatsapp_owner_notifications_restaurant_id_is_read_idx"
  ON "whatsapp_owner_notifications"("restaurant_id", "is_read");

ALTER TABLE "whatsapp_business_profiles"
  ADD CONSTRAINT "whatsapp_business_profiles_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "whatsapp_wizard_sessions"
  ADD CONSTRAINT "whatsapp_wizard_sessions_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "whatsapp_owner_notifications"
  ADD CONSTRAINT "whatsapp_owner_notifications_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
