-- PostgreSQL requires new enum values in a separate committed transaction
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'STARTER';
