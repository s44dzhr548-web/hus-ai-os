-- Enterprise Table Management — additive only
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "floor_plan_json" JSONB;
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "table_sections_json" JSONB;

CREATE INDEX IF NOT EXISTS "dining_tables_branch_operational_idx" ON "dining_tables"("branch_id", "operational_status");
