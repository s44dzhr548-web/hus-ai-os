-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAST_DUE';

-- AlterEnum
ALTER TYPE "CouponType" ADD VALUE IF NOT EXISTS 'FREE_ITEM';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TableRequestType" AS ENUM ('CALL_WAITER', 'REQUEST_BILL', 'CLEAN_TABLE', 'HELP');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TableRequestStatus" AS ENUM ('NEW', 'SEEN', 'DONE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OptionGroupType" AS ENUM ('SIZE', 'ADDON', 'REQUIRED', 'OPTIONAL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_platform_admin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "payment_test_mode" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "whatsapp_number" TEXT;

ALTER TABLE "dining_tables" ADD COLUMN IF NOT EXISTS "table_code" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "dining_tables_table_code_key" ON "dining_tables"("table_code");

-- CreateTable
CREATE TABLE IF NOT EXISTS "menu_item_option_groups" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "menu_item_id" TEXT,
    "name" TEXT NOT NULL,
    "name_ar" TEXT,
    "name_en" TEXT,
    "type" "OptionGroupType" NOT NULL DEFAULT 'OPTIONAL',
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "min_select" INTEGER NOT NULL DEFAULT 0,
    "max_select" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "menu_item_option_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "menu_item_options" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_ar" TEXT,
    "name_en" TEXT,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "menu_item_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "table_requests" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "table_id" TEXT NOT NULL,
    "type" "TableRequestType" NOT NULL,
    "status" "TableRequestStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "table_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "menu_item_option_groups" ADD CONSTRAINT "menu_item_option_groups_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "menu_item_option_groups" ADD CONSTRAINT "menu_item_option_groups_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "menu_item_options" ADD CONSTRAINT "menu_item_options_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "menu_item_option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "table_requests" ADD CONSTRAINT "table_requests_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "menu_item_option_groups_menu_item_id_idx" ON "menu_item_option_groups"("menu_item_id");
CREATE INDEX IF NOT EXISTS "menu_item_options_group_id_idx" ON "menu_item_options"("group_id");
CREATE INDEX IF NOT EXISTS "table_requests_restaurant_id_status_created_at_idx" ON "table_requests"("restaurant_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_restaurant_id_created_at_idx" ON "audit_logs"("restaurant_id", "created_at");
