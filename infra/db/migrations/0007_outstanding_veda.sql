CREATE TABLE IF NOT EXISTS "ocr_corrections" (
	"id" text PRIMARY KEY NOT NULL,
	"import_row_id" text NOT NULL,
	"field" text NOT NULL,
	"model_value" text DEFAULT '' NOT NULL,
	"corrected_value" text DEFAULT '' NOT NULL,
	"document_r2_key" text,
	"layout_cluster_id" text,
	"provider" text DEFAULT '' NOT NULL,
	"prompt_version" text DEFAULT '' NOT NULL,
	"corrected_by" text NOT NULL,
	"corrected_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "person_cluster_members" (
	"id" text PRIMARY KEY NOT NULL,
	"cluster_id" text NOT NULL,
	"prn" text NOT NULL,
	"added_at" bigint NOT NULL,
	"removed_at" bigint,
	"added_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "person_clusters" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'reported_missing' NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "person_link_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"link_id" text NOT NULL,
	"decision" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"evidence_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"decided_by" text NOT NULL,
	"decided_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "person_links" (
	"id" text PRIMARY KEY NOT NULL,
	"prn_a" text NOT NULL,
	"prn_b" text NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"score" double precision,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence_class" text NOT NULL,
	"method" text NOT NULL,
	"matcher_version" text,
	"proposed_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "person_records" (
	"prn" text PRIMARY KEY NOT NULL,
	"record_type" text NOT NULL,
	"record_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"removed_at" bigint
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "record_status_signals" (
	"id" text PRIMARY KEY NOT NULL,
	"prn" text NOT NULL,
	"source" text NOT NULL,
	"kind" text DEFAULT 'status_report' NOT NULL,
	"claimed_status" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" bigint NOT NULL,
	"decided_by" text,
	"decided_at" bigint,
	"decision_note" text
);
--> statement-breakpoint
ALTER TABLE "missing_persons" ADD COLUMN "ip_hash" text;--> statement-breakpoint
ALTER TABLE "missing_persons" ADD COLUMN "tipo_documento" text;--> statement-breakpoint
ALTER TABLE "missing_persons" ADD COLUMN "document_hash" text;--> statement-breakpoint
ALTER TABLE "patient_imports" ADD COLUMN "ocr_provider" text;--> statement-breakpoint
ALTER TABLE "patient_imports" ADD COLUMN "ocr_prompt_version" text;--> statement-breakpoint
ALTER TABLE "patient_imports" ADD COLUMN "source_image_url" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "person_link_decisions" ADD CONSTRAINT "person_link_decisions_link_id_person_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."person_links"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ocr_corrections_row" ON "ocr_corrections" USING btree ("import_row_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_person_cluster_members_live" ON "person_cluster_members" USING btree ("prn") WHERE removed_at IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_person_cluster_members_cluster" ON "person_cluster_members" USING btree ("cluster_id","removed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_person_link_decisions_link" ON "person_link_decisions" USING btree ("link_id","decided_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_person_links_pair" ON "person_links" USING btree ("prn_a","prn_b");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_person_links_queue" ON "person_links" USING btree ("status","proposed_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_person_records_record" ON "person_records" USING btree ("record_type","record_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_record_status_signals_pending" ON "record_status_signals" USING btree ("prn","kind","claimed_status") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_record_status_signals_queue" ON "record_status_signals" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_missing_document_hash" ON "missing_persons" USING btree ("document_hash") WHERE document_hash IS NOT NULL;--> statement-breakpoint
ALTER TABLE "person_links" ADD CONSTRAINT "person_links_pair_ordered" CHECK (prn_a < prn_b);
