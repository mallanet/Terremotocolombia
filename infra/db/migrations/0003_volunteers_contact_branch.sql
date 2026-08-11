-- volunteers: el registro pasa de texto libre al formulario ramificado del
-- llamado Mallanet (contact = WhatsApp o correo; offer queda como detalles
-- opcionales; las columnas nuevas son nullable — expand-contract).
ALTER TABLE "volunteers" RENAME COLUMN "phone" TO "contact";--> statement-breakpoint
ALTER TABLE "volunteers" ADD COLUMN "availability" text;--> statement-breakpoint
ALTER TABLE "volunteers" ADD COLUMN "offer_types" jsonb;--> statement-breakpoint
ALTER TABLE "volunteers" ADD COLUMN "digital_skills" jsonb;--> statement-breakpoint
ALTER TABLE "volunteers" ADD COLUMN "crisis_experience" boolean;--> statement-breakpoint
ALTER TABLE "volunteers" ADD COLUMN "field_city" text;--> statement-breakpoint
ALTER TABLE "volunteers" ADD COLUMN "rescue_training" boolean;--> statement-breakpoint
ALTER TABLE "volunteers" ADD COLUMN "field_role" text;--> statement-breakpoint
ALTER TABLE "volunteers" ADD COLUMN "own_vehicle" boolean;
