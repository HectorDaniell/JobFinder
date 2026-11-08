CREATE TABLE IF NOT EXISTS "experience" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"company" text NOT NULL,
	"role" text NOT NULL,
	"location" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bullet" ADD COLUMN IF NOT EXISTS "experience_id" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "experience_profile_id_idx" ON "experience" ("profile_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "experience" ADD CONSTRAINT "experience_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bullet" ADD CONSTRAINT "bullet_experience_id_experience_id_fk" FOREIGN KEY ("experience_id") REFERENCES "experience"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
