/**
 * Encabezado de la tarjeta de aporte, uno por modalidad.
 *
 * Vive aparte del formulario porque es texto, no lógica: cambiarlo no debería
 * obligar a leer el manejo de Turnstile ni el de importes. Lo consume
 * `DonateForm`, que es quien sabe qué modalidad está elegida.
 *
 * Ninguna variante promete equivalencias de impacto ("tu aporte alimenta a N
 * familias"): no las podemos sostener con datos, y en una emergencia esa clase
 * de frase se vuelve en contra.
 */
import type { DonationInterval } from "@/lib/donation-amounts";

export interface DonateCopy {
  eyebrow: string;
  title: string;
  text: string;
}

export const DONATE_COPY: Record<DonationInterval, DonateCopy> = {
  monthly: {
    eyebrow: "Apoyo recurrente",
    title: "Un aporte cada mes mantiene la plataforma en pie",
    text:
      "La emergencia dura meses, no un fin de semana. Un aporte que se repite " +
      "es lo que permite sostener el sistema sin depender de una campaña " +
      "puntual.",
  },
  once: {
    eyebrow: "Aporte único",
    title: "Un aporte hoy sostiene lo que ya está funcionando",
    text:
      "Un pago único, sin renovación ni compromiso. Cubre los servidores, la " +
      "base de datos y los dominios de los despliegues que ya están " +
      "respondiendo a esta emergencia.",
  },
};
