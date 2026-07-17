-- Additive: customer wishes & song requests (no data changes)

CREATE TYPE "CustomerWishType" AS ENUM ('OCCASION', 'CONGRATULATION', 'SPECIAL_REQUEST', 'NOTE');
CREATE TYPE "CustomerWishStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'COMPLETED', 'REJECTED');
CREATE TYPE "SongRequestTarget" AS ENUM ('SAME_TABLE', 'OTHER_TABLE', 'WHOLE_RESTAURANT');
CREATE TYPE "SongRequestStatus" AS ENUM ('PENDING_REVIEW', 'ACCEPTED', 'REJECTED', 'PLAYING', 'PLAYED');

ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "customer_wishes_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "customer_song_requests_enabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "customer_wishes" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "table_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "table_number" TEXT,
    "customer_name" TEXT,
    "type" "CustomerWishType" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "CustomerWishStatus" NOT NULL DEFAULT 'SUBMITTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "customer_wishes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "song_requests" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "table_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "table_number" TEXT,
    "song_name" TEXT NOT NULL,
    "artist_name" TEXT,
    "link_url" TEXT,
    "dedication_message" TEXT,
    "target" "SongRequestTarget" NOT NULL DEFAULT 'SAME_TABLE',
    "target_table_id" TEXT,
    "target_table_number" TEXT,
    "status" "SongRequestStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "played_at" TIMESTAMP(3),

    CONSTRAINT "song_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "customer_wishes_restaurant_id_status_idx" ON "customer_wishes"("restaurant_id", "status");
CREATE INDEX IF NOT EXISTS "customer_wishes_session_id_idx" ON "customer_wishes"("session_id");
CREATE INDEX IF NOT EXISTS "song_requests_restaurant_id_status_idx" ON "song_requests"("restaurant_id", "status");
CREATE INDEX IF NOT EXISTS "song_requests_session_id_idx" ON "song_requests"("session_id");

ALTER TABLE "customer_wishes" ADD CONSTRAINT "customer_wishes_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_wishes" ADD CONSTRAINT "customer_wishes_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_wishes" ADD CONSTRAINT "customer_wishes_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "dining_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_wishes" ADD CONSTRAINT "customer_wishes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "table_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "song_requests" ADD CONSTRAINT "song_requests_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "song_requests" ADD CONSTRAINT "song_requests_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "song_requests" ADD CONSTRAINT "song_requests_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "dining_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "song_requests" ADD CONSTRAINT "song_requests_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "table_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
