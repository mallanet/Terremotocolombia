CREATE TABLE IF NOT EXISTS "campaign_site_stewards" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"display_name" text DEFAULT 'Responsable de punto' NOT NULL,
	"access_token_hash" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaign_sites" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign" text DEFAULT 'reconstruccion' NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"schedule" text DEFAULT '' NOT NULL,
	"public_contact" text DEFAULT '' NOT NULL,
	"accepts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "material_pledges" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign" text DEFAULT 'reconstruccion' NOT NULL,
	"code" text NOT NULL,
	"site_id" text,
	"donor_name" text NOT NULL,
	"donor_contact" text DEFAULT '' NOT NULL,
	"public_alias" text,
	"items" jsonb NOT NULL,
	"status" text DEFAULT 'pledged' NOT NULL,
	"expected_at" bigint,
	"note" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'web' NOT NULL,
	"ip_hash" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	CONSTRAINT "material_pledges_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "material_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"pledge_id" text,
	"site_id" text NOT NULL,
	"steward_id" text,
	"items" jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"received_at" bigint NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "material_shipments" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign" text DEFAULT 'reconstruccion' NOT NULL,
	"code" text NOT NULL,
	"origin_site_id" text,
	"origin_city" text DEFAULT '' NOT NULL,
	"dest_name" text NOT NULL,
	"dest_lat" double precision,
	"dest_lng" double precision,
	"carrier_note" text DEFAULT '' NOT NULL,
	"items" jsonb NOT NULL,
	"status" text DEFAULT 'loading' NOT NULL,
	"departed_at" bigint,
	"arrived_at" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	CONSTRAINT "material_shipments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_site_stewards" ADD CONSTRAINT "campaign_site_stewards_site_id_campaign_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."campaign_sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_pledges" ADD CONSTRAINT "material_pledges_site_id_campaign_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."campaign_sites"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_receipts" ADD CONSTRAINT "material_receipts_pledge_id_material_pledges_id_fk" FOREIGN KEY ("pledge_id") REFERENCES "public"."material_pledges"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_receipts" ADD CONSTRAINT "material_receipts_site_id_campaign_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."campaign_sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_receipts" ADD CONSTRAINT "material_receipts_steward_id_campaign_site_stewards_id_fk" FOREIGN KEY ("steward_id") REFERENCES "public"."campaign_site_stewards"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_shipments" ADD CONSTRAINT "material_shipments_origin_site_id_campaign_sites_id_fk" FOREIGN KEY ("origin_site_id") REFERENCES "public"."campaign_sites"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_site_stewards_site_idx" ON "campaign_site_stewards" USING btree ("site_id","active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_site_stewards_token_idx" ON "campaign_site_stewards" USING btree ("access_token_hash","active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_sites_campaign_idx" ON "campaign_sites" USING btree ("campaign","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_sites_city_idx" ON "campaign_sites" USING btree ("city");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "material_pledges_campaign_idx" ON "material_pledges" USING btree ("campaign","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "material_pledges_site_idx" ON "material_pledges" USING btree ("site_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "material_receipts_site_idx" ON "material_receipts" USING btree ("site_id","received_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "material_receipts_pledge_idx" ON "material_receipts" USING btree ("pledge_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "material_shipments_campaign_idx" ON "material_shipments" USING btree ("campaign","status");