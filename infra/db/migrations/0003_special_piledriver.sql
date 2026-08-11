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
ALTER TABLE "missing_persons" ADD COLUMN "ip_hash" text;--> statement-breakpoint
ALTER TABLE "patient_imports" ADD COLUMN "ocr_provider" text;--> statement-breakpoint
ALTER TABLE "patient_imports" ADD COLUMN "ocr_prompt_version" text;--> statement-breakpoint
ALTER TABLE "patient_imports" ADD COLUMN "source_image_url" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ocr_corrections_row" ON "ocr_corrections" USING btree ("import_row_id");