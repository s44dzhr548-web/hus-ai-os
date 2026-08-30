-- Public reservation booking fields (additive only — no data loss)

ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "session_type" TEXT;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "public_access_token" TEXT;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "reservations_public_access_token_key"
  ON "reservations"("public_access_token");

CREATE UNIQUE INDEX IF NOT EXISTS "reservations_idempotency_key_key"
  ON "reservations"("idempotency_key");
