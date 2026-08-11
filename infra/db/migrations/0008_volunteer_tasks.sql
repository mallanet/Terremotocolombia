-- Flujo de tareas para voluntarios: tablero del panel + asignación por email
-- con token (sin cuentas). Puntos geográficos opcionales por tarea.
CREATE TABLE "volunteer_tasks" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "kind" text DEFAULT 'terreno' NOT NULL,
  "city" text,
  "origin_name" text,
  "origin_lat" double precision,
  "origin_lng" double precision,
  "dest_name" text,
  "dest_lat" double precision,
  "dest_lng" double precision,
  "transport_note" text,
  "status" text DEFAULT 'open' NOT NULL,
  "created_at" bigint NOT NULL,
  "updated_at" bigint
);
--> statement-breakpoint
CREATE TABLE "volunteer_assignments" (
  "id" text PRIMARY KEY NOT NULL,
  "task_id" text NOT NULL,
  "volunteer_id" text NOT NULL,
  "token" text NOT NULL,
  "status" text DEFAULT 'offered' NOT NULL,
  "created_at" bigint NOT NULL,
  "updated_at" bigint,
  CONSTRAINT "volunteer_assignments_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE INDEX "volunteer_tasks_status_idx" ON "volunteer_tasks" USING btree ("status","created_at" DESC);
--> statement-breakpoint
CREATE INDEX "volunteer_assignments_task_idx" ON "volunteer_assignments" USING btree ("task_id");
--> statement-breakpoint
CREATE INDEX "volunteer_assignments_volunteer_idx" ON "volunteer_assignments" USING btree ("volunteer_id");
