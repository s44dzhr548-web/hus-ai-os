-- Migrate legacy BASIC plans to STARTER
UPDATE "subscriptions" SET "plan" = 'STARTER' WHERE "plan" = 'BASIC';

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "auto_renew" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "moyasar_token" TEXT;

CREATE TYPE "BillingPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE "BillingPaymentType" AS ENUM ('SUBSCRIPTION', 'RENEWAL', 'UPGRADE');

CREATE TABLE "subscription_billing_payments" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "plan" "SubscriptionPlan" NOT NULL,
    "type" "BillingPaymentType" NOT NULL DEFAULT 'SUBSCRIPTION',
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "BillingPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "moyasar_payment_id" TEXT,
    "payment_method" "PaymentMethodType",
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "invoice_number" TEXT NOT NULL,
    "metadata" JSONB,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_billing_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_billing_payments_moyasar_payment_id_key" ON "subscription_billing_payments"("moyasar_payment_id");
CREATE UNIQUE INDEX "subscription_billing_payments_invoice_number_key" ON "subscription_billing_payments"("invoice_number");
CREATE INDEX "subscription_billing_payments_restaurant_id_created_at_idx" ON "subscription_billing_payments"("restaurant_id", "created_at");
CREATE INDEX "subscription_billing_payments_status_idx" ON "subscription_billing_payments"("status");

ALTER TABLE "subscription_billing_payments" ADD CONSTRAINT "subscription_billing_payments_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscription_billing_payments" ADD CONSTRAINT "subscription_billing_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
