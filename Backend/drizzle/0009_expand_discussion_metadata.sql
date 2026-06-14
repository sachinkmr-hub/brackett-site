ALTER TABLE "discussions" ADD COLUMN IF NOT EXISTS "source_type" varchar(80);
ALTER TABLE "discussions" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "discussions" ADD COLUMN IF NOT EXISTS "source_label" varchar(255);
ALTER TABLE "discussions" ADD COLUMN IF NOT EXISTS "source_excerpt" text;
ALTER TABLE "discussions" ADD COLUMN IF NOT EXISTS "category" varchar(120);
ALTER TABLE "discussions" ADD COLUMN IF NOT EXISTS "priority" varchar(50) DEFAULT 'medium' NOT NULL;
