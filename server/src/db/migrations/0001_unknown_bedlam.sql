ALTER TABLE "subscriptions" ADD COLUMN "pending_tier" "subscription_tier";--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "pending_tier_scheduled_at" timestamp with time zone;