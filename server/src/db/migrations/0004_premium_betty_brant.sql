-- Upgrade any existing 'viewer' rows to 'member' before removing the enum value
UPDATE "public"."organization_members" SET "role" = 'member' WHERE "role" = 'viewer';--> statement-breakpoint
UPDATE "public"."invitations" SET "role" = 'member' WHERE "role" = 'viewer';--> statement-breakpoint
ALTER TABLE "public"."invitations" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "public"."organization_members" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."org_role";--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
ALTER TABLE "public"."invitations" ALTER COLUMN "role" SET DATA TYPE "public"."org_role" USING "role"::"public"."org_role";--> statement-breakpoint
ALTER TABLE "public"."organization_members" ALTER COLUMN "role" SET DATA TYPE "public"."org_role" USING "role"::"public"."org_role";
