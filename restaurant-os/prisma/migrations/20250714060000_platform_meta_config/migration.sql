-- Platform Meta OAuth configuration (admin-only, additive)
CREATE TABLE "platform_meta_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "facebook_app_name" TEXT,
    "client_id" TEXT,
    "client_secret_enc" TEXT,
    "webhook_verify_token_enc" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_user_id" TEXT,

    CONSTRAINT "platform_meta_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_admin_alerts" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "restaurant_id" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_admin_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "platform_admin_alerts_kind_is_read_idx" ON "platform_admin_alerts"("kind", "is_read");
