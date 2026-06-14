ALTER TABLE "question_events" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "question_events" ADD CONSTRAINT "question_events_question_workspace_fk" FOREIGN KEY ("question_id","workspace_id") REFERENCES "public"."questions"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "question_assignee_unique_idx" ON "question_assignees" USING btree ("question_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_id_workspace_id_idx" ON "questions" USING btree ("id","workspace_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_auth_provider_check" CHECK ("users"."auth_provider" in ('local', 'clerk'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_external_auth_id_check" CHECK ("users"."auth_provider" = 'local' or "users"."auth_user_id" is not null);--> statement-breakpoint
ALTER TABLE "workspace_integrations" ADD CONSTRAINT "workspace_integrations_provider_check" CHECK ("workspace_integrations"."provider" in ('google', 'slack', 'teams', 'git', 'website'));--> statement-breakpoint
ALTER TABLE "workspace_integrations" ADD CONSTRAINT "workspace_integrations_status_check" CHECK ("workspace_integrations"."status" in ('connected', 'pending', 'ready', 'setup_required', 'failed', 'disabled'));