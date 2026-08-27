-- Captain orders: coexistence with existing checkout orders

CREATE TYPE "OrderSource" AS ENUM ('CHECKOUT', 'CAPTAIN');

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'SERVED';

ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'CAPTAIN';

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "order_source" "OrderSource" NOT NULL DEFAULT 'CHECKOUT';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "accepted_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "preparing_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "ready_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "served_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "orders_idempotency_key_key" ON "orders"("idempotency_key");
CREATE INDEX IF NOT EXISTS "orders_branch_id_order_source_status_created_at_idx" ON "orders"("branch_id", "order_source", "status", "created_at");
