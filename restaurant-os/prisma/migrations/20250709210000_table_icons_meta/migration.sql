-- CreateEnum
CREATE TYPE "TableIcon" AS ENUM ('REGULAR', 'VIP', 'FAMILY', 'OUTDOOR', 'SOFA', 'WINDOW', 'BIRTHDAY', 'BUSINESS', 'PRIVATE_ROOM');

-- AlterTable dining_tables
ALTER TABLE "dining_tables" ADD COLUMN "table_icon" "TableIcon" NOT NULL DEFAULT 'REGULAR';
ALTER TABLE "dining_tables" ADD COLUMN "minimum_spend_amount" DECIMAL(65,30);
ALTER TABLE "dining_tables" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "dining_tables" ADD COLUMN "notes" TEXT;

-- AlterTable table_sessions
ALTER TABLE "table_sessions" ADD COLUMN "table_label" TEXT;
ALTER TABLE "table_sessions" ADD COLUMN "table_icon" "TableIcon";
ALTER TABLE "table_sessions" ADD COLUMN "table_zone" TEXT;
ALTER TABLE "table_sessions" ADD COLUMN "table_capacity" INTEGER;

-- AlterTable reservations
ALTER TABLE "reservations" ADD COLUMN "table_label" TEXT;
ALTER TABLE "reservations" ADD COLUMN "table_icon" "TableIcon";
ALTER TABLE "reservations" ADD COLUMN "table_zone" TEXT;
ALTER TABLE "reservations" ADD COLUMN "minimum_spend_amount" DECIMAL(65,30);

-- AlterTable customer_visits
ALTER TABLE "customer_visits" ADD COLUMN "table_label" TEXT;
ALTER TABLE "customer_visits" ADD COLUMN "table_icon" "TableIcon";
ALTER TABLE "customer_visits" ADD COLUMN "table_zone" TEXT;

-- AlterTable orders
ALTER TABLE "orders" ADD COLUMN "customer_profile_id" TEXT;
ALTER TABLE "orders" ADD COLUMN "table_session_id" TEXT;
ALTER TABLE "orders" ADD COLUMN "table_number" INTEGER;
ALTER TABLE "orders" ADD COLUMN "table_label" TEXT;
ALTER TABLE "orders" ADD COLUMN "table_icon" TEXT;
ALTER TABLE "orders" ADD COLUMN "minimum_spend_amount" DECIMAL(65,30);
ALTER TABLE "orders" ADD COLUMN "customer_name" TEXT;

ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_profile_id_fkey" FOREIGN KEY ("customer_profile_id") REFERENCES "customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_session_id_fkey" FOREIGN KEY ("table_session_id") REFERENCES "table_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "orders_table_session_id_idx" ON "orders"("table_session_id");
CREATE INDEX "orders_customer_profile_id_idx" ON "orders"("customer_profile_id");

-- Backfill session table meta from dining_tables
UPDATE "table_sessions" ts
SET
  "table_label" = dt."label",
  "table_icon" = dt."table_icon",
  "table_zone" = dt."floor_zone",
  "table_capacity" = dt."capacity"
FROM "dining_tables" dt
WHERE ts."table_id" = dt."id" AND ts."table_label" IS NULL;
