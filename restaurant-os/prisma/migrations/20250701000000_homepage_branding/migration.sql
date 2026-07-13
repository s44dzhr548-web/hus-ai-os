-- Customer homepage & premium branding
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "hero_video_url" TEXT;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "hero_image_url" TEXT;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "welcome_text" TEXT;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "welcome_text_en" TEXT;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "cta_text" TEXT DEFAULT 'استكشف المنيو';
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "cta_text_en" TEXT DEFAULT 'Explore Menu';
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "card_style" TEXT DEFAULT 'glass';
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "homepage_sections" JSONB;

-- Luxury dark + gold defaults for new rows (existing rows keep current colors until owner updates)
UPDATE "restaurants"
SET
  "background_color" = COALESCE("background_color", '#0c0a09'),
  "primary_color" = COALESCE("primary_color", '#d4af37'),
  "secondary_color" = COALESCE("secondary_color", '#8b6914'),
  "button_color" = COALESCE("button_color", '#c9a227'),
  "text_color" = COALESCE("text_color", '#faf7f2')
WHERE "slug" = 'menu-os-demo';
