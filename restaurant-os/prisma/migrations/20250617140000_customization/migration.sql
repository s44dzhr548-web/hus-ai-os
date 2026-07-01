-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CategoryLayout" AS ENUM ('GRID', 'LIST', 'CARDS', 'VIDEO_FIRST', 'COMPACT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AlterTable restaurants branding
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "cover_url" TEXT;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "primary_color" TEXT DEFAULT '#047857';
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "secondary_color" TEXT DEFAULT '#065f46';
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "background_color" TEXT DEFAULT '#f9fafb';
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "button_color" TEXT DEFAULT '#047857';
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "text_color" TEXT DEFAULT '#111827';

-- AlterTable menu_categories customization
ALTER TABLE "menu_categories" ADD COLUMN IF NOT EXISTS "color" TEXT DEFAULT '#047857';
ALTER TABLE "menu_categories" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "menu_categories" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
ALTER TABLE "menu_categories" ADD COLUMN IF NOT EXISTS "layout" "CategoryLayout" NOT NULL DEFAULT 'CARDS';

-- AlterTable menu_items gallery
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "gallery_urls" JSONB;
