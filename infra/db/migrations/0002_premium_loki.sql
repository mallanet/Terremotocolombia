CREATE TABLE IF NOT EXISTS "volunteers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"offer" text NOT NULL,
	"zone" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"ip_hash" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteers_created_at_idx" ON "volunteers" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteers_status_idx" ON "volunteers" USING btree ("status","created_at" DESC NULLS LAST);