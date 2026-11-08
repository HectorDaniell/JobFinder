CREATE TABLE IF NOT EXISTS "application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'prepared',
	"cv_document_id" uuid,
	"cover_document_id" uuid,
	"answers" jsonb,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bullet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"text_es" text NOT NULL,
	"text_en" text NOT NULL,
	"skills" text[],
	"category" text NOT NULL,
	"source_role" text,
	"metrics" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"type" text NOT NULL,
	"lang" text NOT NULL,
	"content" jsonb,
	"file_path" text,
	"version" text DEFAULT '1',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"location" text,
	"modality" text DEFAULT 'unknown',
	"seniority" text DEFAULT 'unknown',
	"description" text NOT NULL,
	"url" text NOT NULL,
	"posted_at" timestamp,
	"salary" jsonb,
	"raw" jsonb,
	"dedup_hash" text NOT NULL,
	"ingested_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_score" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"layer" text NOT NULL,
	"score" text NOT NULL,
	"decision" text NOT NULL,
	"reasoning" text,
	"missing_keywords" text[],
	"gap_analysis" text,
	"model" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "llm_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"op" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" text,
	"output_tokens" text,
	"cost_estimate" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"links" jsonb,
	"summary_es" text NOT NULL,
	"summary_en" text NOT NULL,
	"preferences" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profile_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"config" jsonb,
	"enabled" text DEFAULT 'true',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "source_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_job_id_idx" ON "application" ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_status_idx" ON "application" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_event_application_id_idx" ON "application_event" ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bullet_profile_id_idx" ON "bullet" ("profile_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_job_id_idx" ON "document" ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_source_id_idx" ON "job" ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "job_dedup_hash_idx" ON "job" ("dedup_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_score_job_id_idx" ON "job_score" ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "llm_usage_created_at_idx" ON "llm_usage" ("created_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "application" ADD CONSTRAINT "application_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "application" ADD CONSTRAINT "application_cv_document_id_document_id_fk" FOREIGN KEY ("cv_document_id") REFERENCES "document"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "application" ADD CONSTRAINT "application_cover_document_id_document_id_fk" FOREIGN KEY ("cover_document_id") REFERENCES "document"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "application_event" ADD CONSTRAINT "application_event_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bullet" ADD CONSTRAINT "bullet_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document" ADD CONSTRAINT "document_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job" ADD CONSTRAINT "job_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "source"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_score" ADD CONSTRAINT "job_score_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
