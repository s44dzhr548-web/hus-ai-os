-- AlterTable
ALTER TABLE "menu_categories" ADD COLUMN "preview_url" TEXT;

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN "media_type" "CategoryMediaType" NOT NULL DEFAULT 'IMAGE';
ALTER TABLE "menu_items" ADD COLUMN "preview_url" TEXT;
