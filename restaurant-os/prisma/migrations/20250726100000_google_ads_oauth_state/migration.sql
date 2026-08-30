-- Google Ads OAuth CSRF state (server-side, not preview cookies)
CREATE TABLE "google_ads_oauth_states" (
    "id" TEXT NOT NULL,
    "state_key" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_ads_oauth_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "google_ads_oauth_states_state_key_key" ON "google_ads_oauth_states"("state_key");

CREATE INDEX "google_ads_oauth_states_expires_at_idx" ON "google_ads_oauth_states"("expires_at");
