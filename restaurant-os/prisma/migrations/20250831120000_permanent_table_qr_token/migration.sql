-- Permanent table QR tokens (additive only — no data loss)

ALTER TABLE "dining_tables" ADD COLUMN IF NOT EXISTS "public_qr_token" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "dining_tables_public_qr_token_key"
  ON "dining_tables"("public_qr_token");
