CREATE TABLE "workspace_activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"category" varchar(50) NOT NULL,
	"type" varchar(80) NOT NULL,
	"title" varchar(255) NOT NULL,
	"summary" text,
	"target_type" varchar(50),
	"target_id" uuid,
	"payload" jsonb,
	"created_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_activity_events" ADD CONSTRAINT "workspace_activity_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_activity_events" ADD CONSTRAINT "workspace_activity_events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_activity_events_workspace_date_idx" ON "workspace_activity_events" USING btree ("workspace_id","created_at");