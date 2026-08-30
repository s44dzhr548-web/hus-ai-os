ALTER TABLE "marketing_video_jobs" ADD COLUMN IF NOT EXISTS "raw_output_url" TEXT;
ALTER TABLE "marketing_video_jobs" ADD COLUMN IF NOT EXISTS "final_output_url" TEXT;

CREATE TABLE IF NOT EXISTS "marketing_video_brand_settings" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "restaurant_name" TEXT,
    "logo_url" TEXT,
    "primary_color" TEXT,
    "secondary_color" TEXT,
    "text_color" TEXT,
    "default_logo_position" TEXT DEFAULT 'bottom_right',
    "default_logo_timing" TEXT DEFAULT 'end',
    "default_cta" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_video_brand_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "marketing_video_brand_settings_restaurant_id_key" ON "marketing_video_brand_settings"("restaurant_id");

DO $$ BEGIN
  ALTER TABLE "marketing_video_brand_settings" ADD CONSTRAINT "marketing_video_brand_settings_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
