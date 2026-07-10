-- AlterEnum
ALTER TYPE "TableSessionStatus" ADD VALUE IF NOT EXISTS 'FOOD_PREPARING';
ALTER TYPE "TableSessionStatus" ADD VALUE IF NOT EXISTS 'SERVING';

-- CreateEnum
CREATE TYPE "TableOperationalStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'CLEANING', 'OUT_OF_SERVICE');
CREATE TYPE "WaitingListStatus" AS ENUM ('WAITING', 'NOTIFIED', 'SEATED', 'CANCELLED');
CREATE TYPE "TableAssignmentType" AS ENUM ('ASSIGN', 'MOVE', 'MERGE', 'SPLIT');
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'WAIVED');

-- AlterEnum ReservationStatus
ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';
ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'SEATED';
ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'NO_SHOW';

-- AlterTable restaurants
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "reception_deposit_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "reception_deposit_amount" DECIMAL(65,30);

-- AlterTable dining_tables
ALTER TABLE "dining_tables" ADD COLUMN IF NOT EXISTS "operational_status" "TableOperationalStatus" NOT NULL DEFAULT 'AVAILABLE';
ALTER TABLE "dining_tables" ADD COLUMN IF NOT EXISTS "floor_map_x" INTEGER;
ALTER TABLE "dining_tables" ADD COLUMN IF NOT EXISTS "floor_map_y" INTEGER;
ALTER TABLE "dining_tables" ADD COLUMN IF NOT EXISTS "floor_zone" TEXT;

-- AlterTable customer_profiles
ALTER TABLE "customer_profiles" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "customer_profiles" ADD COLUMN IF NOT EXISTS "birthday" TIMESTAMP(3);
ALTER TABLE "customer_profiles" ADD COLUMN IF NOT EXISTS "is_vip" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customer_profiles" ADD COLUMN IF NOT EXISTS "visit_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "customer_profiles" ADD COLUMN IF NOT EXISTS "total_spending" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "customer_profiles" ADD COLUMN IF NOT EXISTS "last_visit_at" TIMESTAMP(3);

-- AlterTable customer_visits
ALTER TABLE "customer_visits" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "customer_visits" ADD COLUMN IF NOT EXISTS "occasion" TEXT;

-- AlterTable table_sessions
ALTER TABLE "table_sessions" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "table_sessions" ADD COLUMN IF NOT EXISTS "occasion" TEXT;
ALTER TABLE "table_sessions" ADD COLUMN IF NOT EXISTS "staff_member_id" TEXT;
ALTER TABLE "table_sessions" ADD COLUMN IF NOT EXISTS "staff_member_name" TEXT;

-- AlterTable reservations
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "preferred_area" TEXT;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "deposit_amount" DECIMAL(65,30);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "deposit_status" "DepositStatus";
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "deposit_payment_id" TEXT;

-- CreateTable waiting_list
CREATE TABLE IF NOT EXISTS "waiting_list" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "customer_profile_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT,
    "guest_count" INTEGER NOT NULL DEFAULT 2,
    "gender" TEXT,
    "occasion" TEXT,
    "notes" TEXT,
    "estimated_wait_minutes" INTEGER NOT NULL DEFAULT 15,
    "status" "WaitingListStatus" NOT NULL DEFAULT 'WAITING',
    "table_session_id" TEXT,
    "notified_at" TIMESTAMP(3),
    "seated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "waiting_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable table_assignments
CREATE TABLE IF NOT EXISTS "table_assignments" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "type" "TableAssignmentType" NOT NULL,
    "from_table_id" TEXT,
    "to_table_id" TEXT,
    "staff_name" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "table_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable reception_notifications
CREATE TABLE IF NOT EXISTS "reception_notifications" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reception_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "waiting_list_restaurant_id_status_created_at_idx" ON "waiting_list"("restaurant_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "table_assignments_restaurant_id_created_at_idx" ON "table_assignments"("restaurant_id", "created_at");
CREATE INDEX IF NOT EXISTS "reception_notifications_restaurant_id_is_read_created_at_idx" ON "reception_notifications"("restaurant_id", "is_read", "created_at");

-- AddForeignKey
ALTER TABLE "waiting_list" DROP CONSTRAINT IF EXISTS "waiting_list_restaurant_id_fkey";
ALTER TABLE "waiting_list" ADD CONSTRAINT "waiting_list_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "waiting_list" DROP CONSTRAINT IF EXISTS "waiting_list_branch_id_fkey";
ALTER TABLE "waiting_list" ADD CONSTRAINT "waiting_list_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "table_assignments" DROP CONSTRAINT IF EXISTS "table_assignments_restaurant_id_fkey";
ALTER TABLE "table_assignments" ADD CONSTRAINT "table_assignments_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "table_assignments" DROP CONSTRAINT IF EXISTS "table_assignments_session_id_fkey";
ALTER TABLE "table_assignments" ADD CONSTRAINT "table_assignments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "table_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reception_notifications" DROP CONSTRAINT IF EXISTS "reception_notifications_restaurant_id_fkey";
ALTER TABLE "reception_notifications" ADD CONSTRAINT "reception_notifications_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
