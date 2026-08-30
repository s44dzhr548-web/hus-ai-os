-- Google Maps embed src (iframe src URL only, no HTML)
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "google_maps_embed_src" TEXT;
