-- CreateEnum
CREATE TYPE "CategoryMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- AlterEnum
ALTER TYPE "CategoryLayout" ADD VALUE IF NOT EXISTS 'IMAGE_FIRST';

-- AlterTable
ALTER TABLE "menu_categories" ADD COLUMN "video_url" TEXT;
ALTER TABLE "menu_categories" ADD COLUMN "media_type" "CategoryMediaType" NOT NULL DEFAULT 'IMAGE';
