CREATE TABLE IF NOT EXISTS "failed_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"form" text NOT NULL,
	"payload" jsonb NOT NULL,
	"error_code" text,
	"created_at" bigint NOT NULL,
	"replayed_at" bigint
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_failed_submissions_pending" ON "failed_submissions" USING btree ("replayed_at","created_at");