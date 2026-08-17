-- Registro fotográfico de la campaña: una foto opcional en el compromiso y
-- otra en la recepción. Uso interno (panel), nunca en respuesta pública.
--
-- Aditiva y compatible hacia atrás: columnas nuevas, anulables, sin default.
-- El código viejo las ignora, así que se puede aplicar ANTES de desplegar el
-- código que las usa, tal como exige AGENTS.md ("el esquema va primero").
ALTER TABLE "material_pledges" ADD COLUMN IF NOT EXISTS "photo" text;--> statement-breakpoint
ALTER TABLE "material_receipts" ADD COLUMN IF NOT EXISTS "photo" text;
