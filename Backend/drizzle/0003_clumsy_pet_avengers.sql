CREATE TABLE "announcement_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"target" varchar(255),
	"status" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"response_metadata" jsonb,
	"error_message" text,
	"created_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"integration_id" uuid,
	"provider" varchar(50) NOT NULL,
	"type" varchar(80) NOT NULL,
	"status" varchar(50) NOT NULL,
	"payload" jsonb,
	"error_message" text,
	"created_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_integrations" ADD COLUMN "config" jsonb;--> statement-breakpoint
ALTER TABLE "workspace_integrations" ADD COLUMN "scopes" jsonb;--> statement-breakpoint
ALTER TABLE "workspace_integrations" ADD COLUMN "access_token_encrypted" text;--> statement-breakpoint
ALTER TABLE "workspace_integrations" ADD COLUMN "refresh_token_encrypted" text;--> statement-breakpoint
ALTER TABLE "workspace_integrations" ADD COLUMN "token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "workspace_integrations" ADD COLUMN "connected_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "workspace_integrations" ADD COLUMN "last_sync_at" timestamp;--> statement-breakpoint
ALTER TABLE "workspace_integrations" ADD COLUMN "last_error" text;--> statement-breakpoint
ALTER TABLE "workspace_integrations" ADD COLUMN "sync_cursor" text;--> statement-breakpoint
ALTER TABLE "announcement_deliveries" ADD CONSTRAINT "announcement_deliveries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_deliveries" ADD CONSTRAINT "announcement_deliveries_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_deliveries" ADD CONSTRAINT "announcement_deliveries_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_integration_id_workspace_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."workspace_integrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcement_deliveries_question_idx" ON "announcement_deliveries" USING btree ("question_id","created_at");--> statement-breakpoint
CREATE INDEX "integration_events_workspace_date_idx" ON "integration_events" USING btree ("workspace_id","created_at");--> statement-breakpoint
ALTER TABLE "workspace_integrations" ADD CONSTRAINT "workspace_integrations_connected_by_user_id_users_id_fk" FOREIGN KEY ("connected_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;