-- Table Management module — additive only (safe for production)
ALTER TABLE "dining_tables" ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "dining_tables" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);

ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "permissions_json" JSONB;

CREATE INDEX IF NOT EXISTS "dining_tables_branch_id_is_archived_idx" ON "dining_tables"("branch_id", "is_archived");
