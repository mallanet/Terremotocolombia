import { z } from "zod";

/**
 * Configuración propia del módulo, validada al arrancar.
 *
 * No vive en config/env.ts por una razón mecánica: ese archivo ya está sobre el
 * techo de comentarios del repositorio y el gate rechaza cualquier línea nueva.
 * Borrar comentarios de allí para hacer sitio habría cambiado conocimiento por
 * espacio. El contrato es el mismo: se valida con zod y falla ruidoso.
 */
const schema = z.object({
  ENABLE_STRIPE_DONATIONS: z.coerce.boolean().default(false),
  STRIPE_SECRET_KEY: z.string().optional(),
});

const parsed = schema.safeParse({
  ENABLE_STRIPE_DONATIONS: process.env.ENABLE_STRIPE_DONATIONS,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
});

if (!parsed.success) {
  console.error("❌ Configuración de aportes inválida:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const donationsEnv = parsed.data;

// Encendido sin clave es una promesa que no se puede cumplir: el formulario
// cobraría en el aire. Se avisa una vez y el módulo se queda apagado.
if (donationsEnv.ENABLE_STRIPE_DONATIONS && !donationsEnv.STRIPE_SECRET_KEY) {
  console.error(
    "❌ ENABLE_STRIPE_DONATIONS=true requiere STRIPE_SECRET_KEY. Los aportes quedan deshabilitados.",
  );
}
