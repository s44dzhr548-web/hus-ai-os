-- CreateTable
CREATE TABLE "ai_assistant_messages" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_assistant_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_assistant_action_logs" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "command_text" TEXT,
    "tool_name" TEXT NOT NULL,
    "input_payload" JSONB,
    "before_state" JSONB,
    "after_state" JSONB,
    "result_summary" TEXT,
    "status" TEXT NOT NULL,
    "confirmation_status" TEXT,
    "idempotency_key" TEXT,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_assistant_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_assistant_pending_actions" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "input_payload" JSONB NOT NULL,
    "preview_summary" TEXT NOT NULL,
    "command_text" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_assistant_pending_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_assistant_messages_restaurant_id_created_at_idx" ON "ai_assistant_messages"("restaurant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_assistant_action_logs_restaurant_id_idempotency_key_key" ON "ai_assistant_action_logs"("restaurant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "ai_assistant_action_logs_restaurant_id_executed_at_idx" ON "ai_assistant_action_logs"("restaurant_id", "executed_at");

-- CreateIndex
CREATE INDEX "ai_assistant_pending_actions_restaurant_id_user_id_created_at_idx" ON "ai_assistant_pending_actions"("restaurant_id", "user_id", "created_at");

-- AddForeignKey
ALTER TABLE "ai_assistant_messages" ADD CONSTRAINT "ai_assistant_messages_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_assistant_action_logs" ADD CONSTRAINT "ai_assistant_action_logs_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_assistant_pending_actions" ADD CONSTRAINT "ai_assistant_pending_actions_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
