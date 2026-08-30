-- CreateEnum
CREATE TYPE "GoogleReviewReplyStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED', 'FAILED');

-- CreateTable
CREATE TABLE "google_business_connections" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "account_name" TEXT,
    "account_id" TEXT,
    "access_token_enc" TEXT,
    "refresh_token_enc" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "connected_at" TIMESTAMP(3),
    "connected_by_user_id" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "last_sync_error" TEXT,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_business_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_business_locations" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "location_name" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "display_name" TEXT,
    "verification_state" TEXT,
    "is_selected" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_business_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_reviews" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "reviewer_name" TEXT,
    "reviewer_photo_url" TEXT,
    "star_rating" INTEGER,
    "comment" TEXT,
    "create_time" TIMESTAMP(3),
    "update_time" TIMESTAMP(3),
    "review_reply" TEXT,
    "google_reply_update_time" TIMESTAMP(3),
    "reply_status" "GoogleReviewReplyStatus" NOT NULL DEFAULT 'DRAFT',
    "draft_text" TEXT,
    "draft_by_user_id" TEXT,
    "approved_by_user_id" TEXT,
    "published_at" TIMESTAMP(3),
    "published_by_user_id" TEXT,
    "google_response_status" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_review_drafts" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "google_review_db_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "GoogleReviewReplyStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_review_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_review_audit_logs" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "google_review_db_id" TEXT,
    "action" TEXT NOT NULL,
    "user_id" TEXT,
    "details_json" JSONB,
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_review_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "google_business_connections_restaurant_id_key" ON "google_business_connections"("restaurant_id");

-- CreateIndex
CREATE UNIQUE INDEX "google_business_locations_restaurant_id_location_id_key" ON "google_business_locations"("restaurant_id", "location_id");

-- CreateIndex
CREATE INDEX "google_business_locations_restaurant_id_is_selected_idx" ON "google_business_locations"("restaurant_id", "is_selected");

-- CreateIndex
CREATE UNIQUE INDEX "google_reviews_restaurant_id_review_id_key" ON "google_reviews"("restaurant_id", "review_id");

-- CreateIndex
CREATE INDEX "google_reviews_restaurant_id_star_rating_idx" ON "google_reviews"("restaurant_id", "star_rating");

-- CreateIndex
CREATE INDEX "google_reviews_restaurant_id_reply_status_idx" ON "google_reviews"("restaurant_id", "reply_status");

-- CreateIndex
CREATE INDEX "google_reviews_restaurant_id_create_time_idx" ON "google_reviews"("restaurant_id", "create_time");

-- CreateIndex
CREATE INDEX "google_review_drafts_restaurant_id_google_review_db_id_idx" ON "google_review_drafts"("restaurant_id", "google_review_db_id");

-- CreateIndex
CREATE INDEX "google_review_audit_logs_restaurant_id_created_at_idx" ON "google_review_audit_logs"("restaurant_id", "created_at");

-- AddForeignKey
ALTER TABLE "google_business_connections" ADD CONSTRAINT "google_business_connections_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_business_locations" ADD CONSTRAINT "google_business_locations_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_business_locations" ADD CONSTRAINT "google_business_locations_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "google_business_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_reviews" ADD CONSTRAINT "google_reviews_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_reviews" ADD CONSTRAINT "google_reviews_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "google_business_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_review_drafts" ADD CONSTRAINT "google_review_drafts_google_review_db_id_fkey" FOREIGN KEY ("google_review_db_id") REFERENCES "google_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_review_audit_logs" ADD CONSTRAINT "google_review_audit_logs_google_review_db_id_fkey" FOREIGN KEY ("google_review_db_id") REFERENCES "google_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
