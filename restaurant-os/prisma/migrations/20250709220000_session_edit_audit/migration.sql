-- Session edit audit + display numbers + visit history

ALTER TABLE "table_sessions" ADD COLUMN "table_display_number" TEXT;
ALTER TABLE "customer_visits" ADD COLUMN "table_display_number" TEXT;
ALTER TABLE "customer_visits" ADD COLUMN "previous_tables" JSONB;
ALTER TABLE "customer_visits" ADD COLUMN "closed_by_staff_name" TEXT;

CREATE TABLE "session_audit_logs" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "staff_user_id" TEXT,
    "staff_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "session_audit_logs_session_id_created_at_idx" ON "session_audit_logs"("session_id", "created_at");
CREATE INDEX "session_audit_logs_restaurant_id_created_at_idx" ON "session_audit_logs"("restaurant_id", "created_at");

ALTER TABLE "session_audit_logs" ADD CONSTRAINT "session_audit_logs_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_audit_logs" ADD CONSTRAINT "session_audit_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "table_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill display numbers from labels
UPDATE "table_sessions" SET "table_display_number" = CAST("table_number" AS TEXT) WHERE "table_display_number" IS NULL;
UPDATE "customer_visits" SET "table_display_number" = CAST("table_number" AS TEXT) WHERE "table_display_number" IS NULL AND "table_number" IS NOT NULL;
