-- AI Platform Engineer Permission Approval Center (additive only)

CREATE TABLE "ai_engineer_global_state" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "emergency_stop" BOOLEAN NOT NULL DEFAULT false,
    "chat_read_only" BOOLEAN NOT NULL DEFAULT false,
    "active_preset" TEXT NOT NULL DEFAULT 'monitoring_only',
    "session_id" TEXT,
    "session_started_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_user_id" TEXT,

    CONSTRAINT "ai_engineer_global_state_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ai_engineer_global_state" ("id", "updated_at")
VALUES ('singleton', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "ai_engineer_permission_grants" (
    "id" TEXT NOT NULL,
    "permission_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "approval_type" TEXT,
    "granted_by_user_id" TEXT,
    "granted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,
    "restaurant_scope" TEXT,
    "branch_scope" TEXT,
    "data_scope" TEXT,
    "session_id" TEXT,
    "last_used_at" TIMESTAMP(3),
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_engineer_permission_grants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_engineer_permission_grants_permission_key_restaurant_scope_branch_scope_key"
ON "ai_engineer_permission_grants"("permission_key", "restaurant_scope", "branch_scope");

CREATE INDEX "ai_engineer_permission_grants_permission_key_enabled_idx"
ON "ai_engineer_permission_grants"("permission_key", "enabled");

CREATE TABLE "ai_engineer_approval_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "permission_key" TEXT NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "granted_by_user_id" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "approval_type" TEXT NOT NULL,
    "restaurant_scope" TEXT,
    "branch_scope" TEXT,
    "session_id" TEXT,
    "pending_action_id" TEXT,

    CONSTRAINT "ai_engineer_approval_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_engineer_approval_tokens_token_hash_key"
ON "ai_engineer_approval_tokens"("token_hash");

CREATE INDEX "ai_engineer_approval_tokens_permission_key_payload_hash_used_at_idx"
ON "ai_engineer_approval_tokens"("permission_key", "payload_hash", "used_at");

CREATE TABLE "ai_engineer_pending_actions" (
    "id" TEXT NOT NULL,
    "title_ar" TEXT NOT NULL,
    "permission_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "preview" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requested_by" TEXT,
    "decided_by_user_id" TEXT,
    "decision" TEXT,
    "decision_reason" TEXT,
    "workflow_id" TEXT,
    "workflow_step" INTEGER,
    "restaurant_scope" TEXT,
    "branch_scope" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "executed_at" TIMESTAMP(3),
    "result_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_engineer_pending_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_engineer_pending_actions_status_created_at_idx"
ON "ai_engineer_pending_actions"("status", "created_at");

CREATE TABLE "ai_engineer_workflows" (
    "id" TEXT NOT NULL,
    "title_ar" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'running',
    "tools_used" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by_user_id" TEXT,
    "started_by" TEXT,
    "result_summary" TEXT,

    CONSTRAINT "ai_engineer_workflows_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_engineer_workflows_status_started_at_idx"
ON "ai_engineer_workflows"("status", "started_at");

CREATE TABLE "ai_engineer_audit_logs" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "user_id" TEXT,
    "permission_key" TEXT,
    "scope" JSONB,
    "decision" TEXT,
    "reason" TEXT,
    "result" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_engineer_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_engineer_audit_logs_event_type_created_at_idx"
ON "ai_engineer_audit_logs"("event_type", "created_at");

CREATE INDEX "ai_engineer_audit_logs_permission_key_created_at_idx"
ON "ai_engineer_audit_logs"("permission_key", "created_at");
