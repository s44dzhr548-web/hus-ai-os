-- Customer Visit Tracking + Immutable Staff Audit (additive only)

-- Extend VisitStatus enum
ALTER TYPE "VisitStatus" ADD VALUE IF NOT EXISTS 'REGISTERED';
ALTER TYPE "VisitStatus" ADD VALUE IF NOT EXISTS 'WAITING';
ALTER TYPE "VisitStatus" ADD VALUE IF NOT EXISTS 'SEATED';
ALTER TYPE "VisitStatus" ADD VALUE IF NOT EXISTS 'NO_SHOW';

-- CustomerVisit tracking fields (nullable for legacy records)
ALTER TABLE "customer_visits" ADD COLUMN IF NOT EXISTS "entered_at" TIMESTAMPTZ;
ALTER TABLE "customer_visits" ADD COLUMN IF NOT EXISTS "registered_at" TIMESTAMPTZ;
ALTER TABLE "customer_visits" ADD COLUMN IF NOT EXISTS "seated_at" TIMESTAMPTZ;
ALTER TABLE "customer_visits" ADD COLUMN IF NOT EXISTS "session_started_at" TIMESTAMPTZ;
ALTER TABLE "customer_visits" ADD COLUMN IF NOT EXISTS "session_ended_at" TIMESTAMPTZ;
ALTER TABLE "customer_visits" ADD COLUMN IF NOT EXISTS "exited_at" TIMESTAMPTZ;
ALTER TABLE "customer_visits" ADD COLUMN IF NOT EXISTS "session_duration_minutes" INTEGER;
ALTER TABLE "customer_visits" ADD COLUMN IF NOT EXISTS "visit_date" DATE;
ALTER TABLE "customer_visits" ADD COLUMN IF NOT EXISTS "table_id" TEXT;
ALTER TABLE "customer_visits" ADD COLUMN IF NOT EXISTS "branch_id" TEXT;
ALTER TABLE "customer_visits" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "customer_visits" ADD COLUMN IF NOT EXISTS "registered_by_user_id" TEXT;
ALTER TABLE "customer_visits" ADD COLUMN IF NOT EXISTS "assigned_by_user_id" TEXT;
ALTER TABLE "customer_visits" ADD COLUMN IF NOT EXISTS "started_by_user_id" TEXT;
ALTER TABLE "customer_visits" ADD COLUMN IF NOT EXISTS "closed_by_user_id" TEXT;

CREATE INDEX IF NOT EXISTS "customer_visits_restaurant_id_entered_at_idx" ON "customer_visits"("restaurant_id", "entered_at");
CREATE INDEX IF NOT EXISTS "customer_visits_branch_id_idx" ON "customer_visits"("branch_id");
CREATE INDEX IF NOT EXISTS "customer_visits_registered_by_user_id_idx" ON "customer_visits"("registered_by_user_id");

DO $$ BEGIN
  ALTER TABLE "customer_visits" ADD CONSTRAINT "customer_visits_table_id_fkey"
    FOREIGN KEY ("table_id") REFERENCES "dining_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "customer_visits" ADD CONSTRAINT "customer_visits_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Immutable staff audit events
CREATE TABLE IF NOT EXISTS "staff_audit_events" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "branch_id" TEXT,
  "staff_user_id" TEXT,
  "staff_name" TEXT,
  "customer_profile_id" TEXT,
  "customer_visit_id" TEXT,
  "reservation_id" TEXT,
  "session_id" TEXT,
  "order_id" TEXT,
  "table_id" TEXT,
  "action" TEXT NOT NULL,
  "previous_value" TEXT,
  "new_value" TEXT,
  "result" TEXT NOT NULL DEFAULT 'success',
  "request_id" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "staff_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "staff_audit_events_restaurant_id_created_at_idx" ON "staff_audit_events"("restaurant_id", "created_at");
CREATE INDEX IF NOT EXISTS "staff_audit_events_staff_user_id_created_at_idx" ON "staff_audit_events"("staff_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "staff_audit_events_action_idx" ON "staff_audit_events"("action");

ALTER TABLE "staff_audit_events"
  ADD CONSTRAINT "staff_audit_events_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enrich staff activity logs for login history
ALTER TABLE "staff_activity_logs" ADD COLUMN IF NOT EXISTS "ip_address" TEXT;
ALTER TABLE "staff_activity_logs" ADD COLUMN IF NOT EXISTS "user_agent" TEXT;
ALTER TABLE "staff_activity_logs" ADD COLUMN IF NOT EXISTS "login_success" BOOLEAN DEFAULT true;
ALTER TABLE "staff_activity_logs" ADD COLUMN IF NOT EXISTS "failure_reason" TEXT;
ALTER TABLE "staff_activity_logs" ADD COLUMN IF NOT EXISTS "end_reason" TEXT;
ALTER TABLE "staff_activity_logs" ADD COLUMN IF NOT EXISTS "session_duration_minutes" INTEGER;

-- Backfill visit_date from arrival_time / created_at (non-destructive)
UPDATE "customer_visits"
SET "visit_date" = DATE(COALESCE("arrival_time", "created_at"))
WHERE "visit_date" IS NULL;

UPDATE "customer_visits"
SET "entered_at" = COALESCE("arrival_time", "created_at")
WHERE "entered_at" IS NULL AND ("arrival_time" IS NOT NULL OR "created_at" IS NOT NULL);

UPDATE "customer_visits"
SET "session_ended_at" = "end_time", "exited_at" = "end_time"
WHERE "session_ended_at" IS NULL AND "end_time" IS NOT NULL;
