-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- AlterTable: customer_visits
ALTER TABLE "customer_visits" ADD COLUMN "table_number" INTEGER;
ALTER TABLE "customer_visits" ADD COLUMN "minimum_spend_amount" DECIMAL(65,30);
ALTER TABLE "customer_visits" ADD COLUMN "arrival_time" TIMESTAMP(3);
ALTER TABLE "customer_visits" ADD COLUMN "end_time" TIMESTAMP(3);
ALTER TABLE "customer_visits" ADD COLUMN "total_bill" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "customer_visits" ADD COLUMN "orders_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "customer_visits" ADD COLUMN "visit_status" "VisitStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "customer_visits" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: table_sessions
ALTER TABLE "table_sessions" ADD COLUMN "total_bill" DECIMAL(65,30);
ALTER TABLE "table_sessions" ADD COLUMN "orders_count" INTEGER;

-- AlterTable: reservations
ALTER TABLE "reservations" ADD COLUMN "arrived_at" TIMESTAMP(3);
ALTER TABLE "reservations" ADD COLUMN "completed_at" TIMESTAMP(3);
ALTER TABLE "reservations" ADD COLUMN "cancelled_at" TIMESTAMP(3);
ALTER TABLE "reservations" ADD COLUMN "no_show_at" TIMESTAMP(3);

-- Backfill visit arrival from linked sessions
UPDATE "customer_visits" cv
SET
  "arrival_time" = ts."started_at",
  "table_number" = ts."table_number",
  "minimum_spend_amount" = ts."minimum_spend_amount",
  "end_time" = ts."ended_at",
  "visit_status" = CASE WHEN ts."status" = 'COMPLETED' THEN 'COMPLETED'::"VisitStatus" ELSE 'ACTIVE'::"VisitStatus" END
FROM "table_sessions" ts
WHERE ts."customer_visit_id" = cv."id";
