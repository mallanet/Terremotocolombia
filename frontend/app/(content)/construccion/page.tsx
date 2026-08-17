import { permanentRedirect } from "next/navigation";

/**
 * /construccion es el nombre por el que mucha gente va a buscar la campaña
 * (y el que se dijo en voz alta antes de fijar el definitivo). Redirige a
 * /reconstruccion en vez de duplicar la página: una sola URL indexada, una
 * sola fuente de contenido.
 */
export default function ConstruccionPage() {
  permanentRedirect("/reconstruccion");
}
