-- Persistent reservation register (additive only)
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "reservation_number" TEXT;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'dashboard';
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMP(3);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "confirmed_by_user_id" TEXT;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "seated_at" TIMESTAMP(3);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "session_ended_at" TIMESTAMP(3);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "completed_by_user_id" TEXT;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMP(3);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "created_by_user_id" TEXT;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "updated_by_user_id" TEXT;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);

UPDATE "reservations"
SET "source" = COALESCE("source", 'legacy')
WHERE "source" IS NULL;

UPDATE "reservations"
SET "session_ended_at" = "completed_at"
WHERE "session_ended_at" IS NULL AND "completed_at" IS NOT NULL;

UPDATE "reservations"
SET "seated_at" = COALESCE("assigned_at", "checked_in_at", "arrived_at")
WHERE "seated_at" IS NULL
  AND "status" IN ('SEATED', 'CONVERTED', 'COMPLETED');

UPDATE "reservations"
SET "confirmed_at" = "created_at"
WHERE "confirmed_at" IS NULL
  AND "status" IN ('APPROVED', 'CONFIRMED', 'ARRIVED', 'CHECKED_IN', 'SEATED', 'CONVERTED', 'COMPLETED');

WITH numbered AS (
  SELECT
    id,
    restaurant_id,
    ROW_NUMBER() OVER (PARTITION BY restaurant_id ORDER BY created_at ASC, id ASC) AS rn
  FROM "reservations"
  WHERE "reservation_number" IS NULL OR TRIM("reservation_number") = ''
)
UPDATE "reservations" r
SET "reservation_number" = 'R-' || LPAD(n.rn::TEXT, 5, '0')
FROM numbered n
WHERE r.id = n.id;

CREATE TABLE IF NOT EXISTS "reservation_status_history" (
  "id" TEXT NOT NULL,
  "reservation_id" TEXT NOT NULL,
  "previous_status" "ReservationStatus",
  "new_status" "ReservationStatus" NOT NULL,
  "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "changed_by_user_id" TEXT,
  "note" TEXT,
  CONSTRAINT "reservation_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "reservation_audit_logs" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "reservation_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "user_id" TEXT,
  "user_name" TEXT,
  "old_values" JSONB,
  "new_values" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reservation_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "reservation_status_history_reservation_id_changed_at_idx"
  ON "reservation_status_history"("reservation_id", "changed_at");

CREATE INDEX IF NOT EXISTS "reservation_audit_logs_restaurant_id_reservation_id_created_at_idx"
  ON "reservation_audit_logs"("restaurant_id", "reservation_id", "created_at");

CREATE INDEX IF NOT EXISTS "reservations_restaurant_id_created_at_idx"
  ON "reservations"("restaurant_id", "created_at");

CREATE INDEX IF NOT EXISTS "reservations_restaurant_id_reservation_number_idx"
  ON "reservations"("restaurant_id", "reservation_number");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservation_status_history_reservation_id_fkey'
  ) THEN
    ALTER TABLE "reservation_status_history"
      ADD CONSTRAINT "reservation_status_history_reservation_id_fkey"
      FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservation_audit_logs_reservation_id_fkey'
  ) THEN
    ALTER TABLE "reservation_audit_logs"
      ADD CONSTRAINT "reservation_audit_logs_reservation_id_fkey"
      FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
