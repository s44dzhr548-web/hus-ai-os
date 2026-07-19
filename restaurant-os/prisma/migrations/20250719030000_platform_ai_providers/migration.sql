-- Platform-level AI Brain provider connections (additive only)

CREATE TABLE "platform_ai_provider_connections" (
    "id" TEXT NOT NULL,
    "provider_key" TEXT NOT NULL,
    "api_key_enc" TEXT,
    "model_id" TEXT,
    "status" "MarketingProviderStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "role_assignments" JSONB,
    "last_test_at" TIMESTAMP(3),
    "last_success_at" TIMESTAMP(3),
    "last_error" TEXT,
    "connected_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_ai_provider_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_ai_provider_connections_provider_key_key"
ON "platform_ai_provider_connections"("provider_key");
