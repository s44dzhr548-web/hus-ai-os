-- Owner Monitoring Dashboard (additive only)
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "monitoring_settings_json" JSONB;

CREATE TABLE IF NOT EXISTS "staff_activity_logs" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "staff_id" TEXT,
    "staff_name" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "staff_activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "owner_notifications" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "owner_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "staff_activity_logs_restaurant_id_created_at_idx" ON "staff_activity_logs"("restaurant_id", "created_at");
CREATE INDEX IF NOT EXISTS "owner_notifications_restaurant_id_created_at_idx" ON "owner_notifications"("restaurant_id", "created_at");

DO $$ BEGIN
  ALTER TABLE "staff_activity_logs" ADD CONSTRAINT "staff_activity_logs_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "staff_activity_logs" ADD CONSTRAINT "staff_activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "staff_activity_logs" ADD CONSTRAINT "staff_activity_logs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "owner_notifications" ADD CONSTRAINT "owner_notifications_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
