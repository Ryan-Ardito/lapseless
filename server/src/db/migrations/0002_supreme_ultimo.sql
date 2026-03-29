ALTER TYPE "public"."reminder_frequency" ADD VALUE 'custom';--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "default_reminder" SET DEFAULT '{"channels":["email"],"daysBefore":7,"frequency":"once","time":"09:00"}'::jsonb;--> statement-breakpoint
ALTER TABLE "obligations" ADD COLUMN "reminder_dates" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "obligations" ADD COLUMN "reminder_time" text;