CREATE TABLE "marketing_video_jobs" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "provider_key" TEXT NOT NULL,
    "external_task_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "mode" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "aspect_ratio" TEXT NOT NULL,
    "duration_sec" INTEGER NOT NULL,
    "model_id" TEXT,
    "progress" DOUBLE PRECISION,
    "output_url" TEXT,
    "error_message" TEXT,
    "creative_id" TEXT,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_video_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "marketing_video_jobs_restaurant_id_created_at_idx" ON "marketing_video_jobs"("restaurant_id", "created_at");
CREATE INDEX "marketing_video_jobs_external_task_id_idx" ON "marketing_video_jobs"("external_task_id");

ALTER TABLE "marketing_video_jobs" ADD CONSTRAINT "marketing_video_jobs_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
