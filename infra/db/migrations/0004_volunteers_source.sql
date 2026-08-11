-- Origen del registro de voluntario (utm / referrer / "directo") para que el
-- panel sepa de dónde llega cada persona. Nullable: filas viejas quedan NULL.
ALTER TABLE "volunteers" ADD COLUMN "source" text;
