CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'delivered', 'failed', 'skipped');

ALTER TABLE "notifications" ADD COLUMN "delivery_status" "delivery_status" DEFAULT 'pending' NOT NULL;
ALTER TABLE "notifications" ADD COLUMN "delivery_attempts" integer DEFAULT 0 NOT NULL;
ALTER TABLE "notifications" ADD COLUMN "delivery_error" text;

-- Backfill: existing notifications were already processed by the old BullMQ system
UPDATE "notifications" SET "delivery_status" = 'skipped' WHERE "delivery_status" = 'pending';

CREATE INDEX "notifications_delivery_pending_idx" ON "notifications" USING btree ("delivery_status", "channel");
