-- Código único de voluntario + check-ins con evidencia + atribución de reportes.
-- Expand-contract: columnas nuevas nullable primero; el NOT NULL de `code`
-- llega DESPUÉS del backfill, en la misma migración (la tabla es chica).

ALTER TABLE "volunteers" ADD COLUMN "code" text;

ALTER TABLE "reports" ADD COLUMN "volunteer_id" text;

CREATE TABLE "volunteer_checkins" (
  "id" text PRIMARY KEY NOT NULL,
  "volunteer_id" text NOT NULL,
  "place" text NOT NULL,
  "note" text DEFAULT '' NOT NULL,
  "photo" text,
  "created_at" bigint NOT NULL
);

-- Backfill: un código de 6 dígitos único por voluntario existente.
DO $$
DECLARE
  r RECORD;
  c TEXT;
BEGIN
  FOR r IN SELECT id FROM volunteers WHERE code IS NULL LOOP
    LOOP
      c := lpad(floor(random() * 1000000)::int::text, 6, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM volunteers WHERE code = c);
    END LOOP;
    UPDATE volunteers SET code = c WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE "volunteers" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "volunteers_code_unique" ON "volunteers" ("code");
CREATE INDEX "volunteer_checkins_volunteer_idx" ON "volunteer_checkins" ("volunteer_id", "created_at" DESC);
CREATE INDEX "volunteer_checkins_created_at_idx" ON "volunteer_checkins" ("created_at" DESC);

ALTER TABLE "reports" ADD CONSTRAINT "reports_volunteer_id_volunteers_id_fk"
  FOREIGN KEY ("volunteer_id") REFERENCES "volunteers"("id") ON DELETE SET NULL;
ALTER TABLE "volunteer_checkins" ADD CONSTRAINT "volunteer_checkins_volunteer_id_volunteers_id_fk"
  FOREIGN KEY ("volunteer_id") REFERENCES "volunteers"("id") ON DELETE CASCADE;
