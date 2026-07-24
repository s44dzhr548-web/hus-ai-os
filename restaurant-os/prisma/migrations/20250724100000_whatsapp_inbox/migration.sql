-- WhatsApp Inbox (conversations, messages, contacts) — new data only from webhook activation

ALTER TABLE "whatsapp_business_profiles" ADD COLUMN IF NOT EXISTS "inbox_quick_replies_json" JSONB;

CREATE TABLE IF NOT EXISTS "whatsapp_contacts" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "waba_id" TEXT,
    "wa_id" TEXT NOT NULL,
    "display_name" TEXT,
    "customer_profile_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "whatsapp_conversations" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "waba_id" TEXT NOT NULL,
    "phone_number_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "category" TEXT,
    "assigned_user_id" TEXT,
    "last_message_at" TIMESTAMP(3),
    "last_message_preview" TEXT,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "last_customer_message_at" TIMESTAMP(3),
    "reservation_draft_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "waba_id" TEXT,
    "phone_number_id" TEXT,
    "direction" TEXT NOT NULL,
    "message_type" TEXT NOT NULL,
    "body_text" TEXT,
    "media_url" TEXT,
    "media_mime_type" TEXT,
    "media_caption" TEXT,
    "template_name" TEXT,
    "provider_message_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "failed_reason" TEXT,
    "sent_by_user_id" TEXT,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "whatsapp_assignments" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "assigned_user_id" TEXT NOT NULL,
    "assigned_by_user_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "whatsapp_internal_notes" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "author_user_id" TEXT,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_internal_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "whatsapp_inbox_audit_logs" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "details_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_inbox_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_contacts_restaurant_id_wa_id_key" ON "whatsapp_contacts"("restaurant_id", "wa_id");
CREATE INDEX IF NOT EXISTS "whatsapp_contacts_restaurant_id_idx" ON "whatsapp_contacts"("restaurant_id");

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_conversations_restaurant_id_contact_id_phone_number_id_key" ON "whatsapp_conversations"("restaurant_id", "contact_id", "phone_number_id");
CREATE INDEX IF NOT EXISTS "whatsapp_conversations_restaurant_id_last_message_at_idx" ON "whatsapp_conversations"("restaurant_id", "last_message_at");
CREATE INDEX IF NOT EXISTS "whatsapp_conversations_restaurant_id_status_idx" ON "whatsapp_conversations"("restaurant_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_messages_provider_message_id_key" ON "whatsapp_messages"("provider_message_id");
CREATE INDEX IF NOT EXISTS "whatsapp_messages_conversation_id_created_at_idx" ON "whatsapp_messages"("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "whatsapp_messages_restaurant_id_created_at_idx" ON "whatsapp_messages"("restaurant_id", "created_at");

CREATE INDEX IF NOT EXISTS "whatsapp_assignments_conversation_id_created_at_idx" ON "whatsapp_assignments"("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "whatsapp_internal_notes_conversation_id_created_at_idx" ON "whatsapp_internal_notes"("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "whatsapp_inbox_audit_logs_restaurant_id_created_at_idx" ON "whatsapp_inbox_audit_logs"("restaurant_id", "created_at");

ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "whatsapp_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_assignments" ADD CONSTRAINT "whatsapp_assignments_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_internal_notes" ADD CONSTRAINT "whatsapp_internal_notes_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_inbox_audit_logs" ADD CONSTRAINT "whatsapp_inbox_audit_logs_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
