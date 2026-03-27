-- Update any existing whatsapp notifications/channels to email before dropping the enum value
UPDATE "public"."notifications" SET "channel" = 'email' WHERE "channel" = 'whatsapp';--> statement-breakpoint
UPDATE "public"."obligations" SET "notification_channels" = (
  SELECT jsonb_agg(DISTINCT val) FROM (
    SELECT CASE WHEN val = 'whatsapp' THEN 'email' ELSE val END AS val
    FROM jsonb_array_elements_text("notification_channels") AS val
  ) sub
) WHERE "notification_channels"::text LIKE '%whatsapp%';--> statement-breakpoint
UPDATE "public"."user_settings" SET "default_reminder" = jsonb_set(
  "default_reminder",
  '{channels}',
  (SELECT jsonb_agg(DISTINCT val) FROM (
    SELECT CASE WHEN val = 'whatsapp' THEN 'email' ELSE val END AS val
    FROM jsonb_array_elements_text("default_reminder"->'channels') AS val
  ) sub)
) WHERE "default_reminder"->>'channels' LIKE '%whatsapp%';--> statement-breakpoint
ALTER TABLE "public"."notifications" ALTER COLUMN "channel" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."channel";--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('sms', 'email', 'browser');--> statement-breakpoint
ALTER TABLE "public"."notifications" ALTER COLUMN "channel" SET DATA TYPE "public"."channel" USING "channel"::"public"."channel";
