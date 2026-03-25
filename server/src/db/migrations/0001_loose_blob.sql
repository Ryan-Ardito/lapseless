ALTER TYPE "public"."subscription_tier" ADD VALUE 'demo' BEFORE 'solo';--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "tier" SET DEFAULT 'demo';