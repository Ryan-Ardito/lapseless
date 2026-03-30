ALTER TABLE "notifications" ADD COLUMN "deliver_after" timestamp with time zone;--> statement-breakpoint
UPDATE "notifications" SET "deliver_after" = "triggered_at" WHERE "deliver_after" IS NULL;