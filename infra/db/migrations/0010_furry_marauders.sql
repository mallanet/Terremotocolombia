CREATE TABLE IF NOT EXISTS "official_deceased_lists" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"source_name" text NOT NULL,
	"source_url" text NOT NULL,
	"published_at" bigint,
	"created_by" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "official_deceased_records" (
	"id" text PRIMARY KEY NOT NULL,
	"list_id" text NOT NULL,
	"name" text NOT NULL,
	"age" integer,
	"location" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "official_deceased_records" ADD CONSTRAINT "official_deceased_records_list_id_official_deceased_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."official_deceased_lists"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_official_deceased_lists_source_url" ON "official_deceased_lists" USING btree ("source_url");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_official_deceased_records_list" ON "official_deceased_records" USING btree ("list_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_official_deceased_records_name" ON "official_deceased_records" USING btree ("name");