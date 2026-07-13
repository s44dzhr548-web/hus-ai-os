-- Table Gifts (additive) — peer-to-peer menu gifts between tables
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "TableGiftStatus" AS ENUM (
  'PENDING_ACCEPTANCE',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'PAYMENT_PENDING',
  'PAID',
  'PREPARING',
  'READY',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED'
);

CREATE TABLE IF NOT EXISTS "table_gifts" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "branch_id" TEXT,
  "sender_session_id" TEXT NOT NULL,
  "sender_table_id" TEXT NOT NULL,
  "sender_table_number" TEXT NOT NULL,
  "receiver_session_id" TEXT NOT NULL,
  "receiver_table_id" TEXT NOT NULL,
  "receiver_table_number" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "product_name" TEXT NOT NULL,
  "product_image_url" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_price" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "gift_message" TEXT,
  "sender_display_name" TEXT,
  "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
  "status" "TableGiftStatus" NOT NULL DEFAULT 'PENDING_ACCEPTANCE',
  "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
  "order_id" TEXT,
  "expires_at" TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 minutes'),
  "accepted_at" TIMESTAMPTZ,
  "rejected_at" TIMESTAMPTZ,
  "expired_at" TIMESTAMPTZ,
  "paid_at" TIMESTAMPTZ,
  "delivered_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "table_gifts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "table_gifts_quantity_positive" CHECK ("quantity" > 0),
  CONSTRAINT "table_gifts_different_tables" CHECK ("sender_table_id" <> "receiver_table_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "table_gifts_order_id_key" ON "table_gifts"("order_id");
CREATE INDEX IF NOT EXISTS "table_gifts_restaurant_id_status_idx" ON "table_gifts"("restaurant_id", "status");
CREATE INDEX IF NOT EXISTS "table_gifts_receiver_session_id_status_idx" ON "table_gifts"("receiver_session_id", "status");
CREATE INDEX IF NOT EXISTS "table_gifts_expires_at_idx" ON "table_gifts"("expires_at");

ALTER TABLE "table_gifts"
  ADD CONSTRAINT "table_gifts_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "table_gifts"
  ADD CONSTRAINT "table_gifts_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "table_gifts"
  ADD CONSTRAINT "table_gifts_sender_session_id_fkey"
  FOREIGN KEY ("sender_session_id") REFERENCES "table_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "table_gifts"
  ADD CONSTRAINT "table_gifts_receiver_session_id_fkey"
  FOREIGN KEY ("receiver_session_id") REFERENCES "table_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "table_gifts"
  ADD CONSTRAINT "table_gifts_sender_table_id_fkey"
  FOREIGN KEY ("sender_table_id") REFERENCES "dining_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "table_gifts"
  ADD CONSTRAINT "table_gifts_receiver_table_id_fkey"
  FOREIGN KEY ("receiver_table_id") REFERENCES "dining_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "table_gifts"
  ADD CONSTRAINT "table_gifts_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "table_gifts"
  ADD CONSTRAINT "table_gifts_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
