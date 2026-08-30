CREATE TABLE IF NOT EXISTS "marketing_video_media_assets" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT,
    "url" TEXT NOT NULL,
    "r2_key" TEXT,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "thumbnail_url" TEXT,
    "duration_sec" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'device',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "metadata_json" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "marketing_video_media_assets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "marketing_video_media_assets_restaurant_id_category_idx" ON "marketing_video_media_assets"("restaurant_id", "category");
CREATE INDEX IF NOT EXISTS "marketing_video_media_assets_restaurant_id_created_at_idx" ON "marketing_video_media_assets"("restaurant_id", "created_at");

ALTER TABLE "marketing_video_media_assets" ADD CONSTRAINT "marketing_video_media_assets_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "marketing_video_studio_projects" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'مشروع فيديو',
    "prompt" TEXT NOT NULL DEFAULT '',
    "provider_key" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'text_to_video',
    "aspect_ratio" TEXT NOT NULL DEFAULT '9:16',
    "duration_sec" INTEGER NOT NULL DEFAULT 5,
    "model_id" TEXT,
    "primary_asset_id" TEXT,
    "reference_video_asset_id" TEXT,
    "brand_json" JSONB,
    "storyboard_json" JSONB NOT NULL DEFAULT '[]',
    "asset_ids_json" JSONB NOT NULL DEFAULT '[]',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "marketing_video_studio_projects_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "marketing_video_studio_projects_restaurant_id_updated_at_idx" ON "marketing_video_studio_projects"("restaurant_id", "updated_at");

ALTER TABLE "marketing_video_studio_projects" ADD CONSTRAINT "marketing_video_studio_projects_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "marketing_video_jobs" ADD COLUMN IF NOT EXISTS "project_id" TEXT;
ALTER TABLE "marketing_video_jobs" ADD COLUMN IF NOT EXISTS "estimated_cost" DECIMAL(10,2);

CREATE INDEX IF NOT EXISTS "marketing_video_jobs_project_id_idx" ON "marketing_video_jobs"("project_id");

DO $$ BEGIN
  ALTER TABLE "marketing_video_jobs" ADD CONSTRAINT "marketing_video_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "marketing_video_studio_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
