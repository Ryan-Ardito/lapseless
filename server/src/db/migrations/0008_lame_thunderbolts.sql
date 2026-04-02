CREATE TYPE "public"."history_action" AS ENUM('create', 'update', 'delete', 'complete', 'uncomplete');--> statement-breakpoint
CREATE TYPE "public"."history_entity_type" AS ENUM('obligation', 'checklist', 'pto-entry', 'document');--> statement-breakpoint
CREATE TABLE "history_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_type" "history_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_name" text NOT NULL,
	"action" "history_action" NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"undone" boolean DEFAULT false NOT NULL,
	"renewed_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "history_entries" ADD CONSTRAINT "history_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history_entries" ADD CONSTRAINT "history_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "history_entries_org_id_idx" ON "history_entries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "history_entries_org_user_idx" ON "history_entries" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "history_entries_created_at_idx" ON "history_entries" USING btree ("created_at");