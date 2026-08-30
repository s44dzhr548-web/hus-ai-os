-- Waiter/Captain order confirmation workflow (backward-compatible, no data loss)

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "public_access_token" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "confirmed_by_user_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "orders_public_access_token_key" ON "orders"("public_access_token");

CREATE TABLE IF NOT EXISTS "order_status_history" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "from_status" "OrderStatus",
  "to_status" "OrderStatus" NOT NULL,
  "changed_by_user_id" TEXT,
  "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "order_status_history_order_id_changed_at_idx"
  ON "order_status_history"("order_id", "changed_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_status_history_order_id_fkey'
  ) THEN
    ALTER TABLE "order_status_history"
      ADD CONSTRAINT "order_status_history_order_id_fkey"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
