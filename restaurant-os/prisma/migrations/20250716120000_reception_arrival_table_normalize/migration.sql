-- Reception arrival + table normalization (additive only)
ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'CHECKED_IN';

ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "checked_in_at" TIMESTAMP(3);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "table_number_snapshot" TEXT;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "assigned_by_user_id" TEXT;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "assigned_at" TIMESTAMP(3);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "current_visit_id" TEXT;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "active_session_id" TEXT;

ALTER TABLE "dining_tables" ADD COLUMN IF NOT EXISTS "display_number" TEXT;
ALTER TABLE "dining_tables" ADD COLUMN IF NOT EXISTS "normalized_number" TEXT;

-- Backfill display/normalized from existing data (read-only transform)
UPDATE "dining_tables"
SET
  "display_number" = COALESCE(NULLIF(TRIM("label"), ''), "number"::TEXT),
  "normalized_number" = REGEXP_REPLACE(
    LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          TRANSLATE(
            COALESCE(NULLIF(TRIM("label"), ''), "number"::TEXT),
            '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹',
            '01234567890123456789'
          ),
          '^(طاولة|table)\s*',
          '',
          'i'
        ),
        '[\s\-_]+',
        '',
        'g'
      )
    ),
    '[^a-z0-9]',
    '',
    'g'
  )
WHERE "normalized_number" IS NULL OR "normalized_number" = '';

CREATE UNIQUE INDEX IF NOT EXISTS "dining_tables_branch_id_normalized_number_key"
  ON "dining_tables"("branch_id", "normalized_number")
  WHERE "normalized_number" IS NOT NULL AND "normalized_number" <> '' AND "is_archived" = false;
