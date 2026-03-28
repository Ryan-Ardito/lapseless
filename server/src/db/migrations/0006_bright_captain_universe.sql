ALTER TABLE "invitations" DROP CONSTRAINT "invitations_invited_by_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "invitations_org_email_idx";--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "invited_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_org_email_pending_idx" ON "invitations" USING btree ("organization_id","email") WHERE "invitations"."status" = 'pending';--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_role_check" CHECK ("invitations"."role" IN ('admin', 'member'));