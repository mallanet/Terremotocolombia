import Link from "next/link";
import type { FaqEntry } from "@/lib/jsonld";
import { CONTACT_EMAIL, SITE_BRAND_NAME } from "@/lib/site";

/**
 * Preguntas frecuentes del aporte económico, visibles y emitidas como FAQPage.
 *
 * Mismo trato que en la campaña: una sola fuente para lo que se muestra y para
 * lo que se marca. Ninguna respuesta promete un beneficio fiscal ni un impacto
 * medible: lo que se puede sostener es a qué se destina el dinero, quién cobra
 * y cómo se cancela.
 */
export const SUPPORT_FAQS: FaqEntry[] = [
  {
    question: "¿A dónde va mi aporte?",
    answer:
      "A sostener la plataforma: servidores, base de datos, dominios y el trabajo de mantenerla funcionando durante la emergencia y de desplegarla en la siguiente. No es un aporte a una organización de socorro; si eso es lo que buscas, la página de donaciones lista los canales oficiales verificados y ahí no intermediamos.",
  },
  {
    question: "¿Cuál es la diferencia entre el aporte mensual y el único?",
    answer:
      "El mensual se repite cada mes hasta que lo canceles, y es lo que permite sostener el sistema sin depender de una campaña puntual. El único es un solo pago, sin renovación y sin compromiso.",
  },
  {
    question: "¿Cómo cancelo el aporte mensual?",
    answer: `Escribe a ${CONTACT_EMAIL} y lo cancelamos. No hay permanencia ni penalización, y puedes volver a activarlo cuando quieras.`,
  },
  {
    question: "¿Es seguro pagar aquí?",
    answer:
      "El cobro lo procesa Stripe en su propia página segura. No vemos ni guardamos los datos de tu tarjeta, y el formulario del sitio no te pide nombre ni correo: lo que haga falta para el cobro te lo pide Stripe.",
  },
  {
    question: "¿Quién está detrás de la plataforma?",
    answer: `${SITE_BRAND_NAME} es una iniciativa ciudadana, independiente y no gubernamental, mantenida por voluntarios. No representa a ningún gobierno, partido ni empresa, y el código de la plataforma es abierto y público.`,
  },
];

export default function SupportFaq() {
  return (
    <section className="mx-auto w-full max-w-[720px] px-4 pb-12 sm:px-6">
      <h2 className="text-xl font-bold text-slate-900">Preguntas frecuentes</h2>
      <dl className="mt-4 space-y-4">
        {SUPPORT_FAQS.map((faq) => (
          <div key={faq.question} className="rounded-[20px] bg-slate-50 p-5">
            <dt className="text-sm font-semibold text-slate-900">
              {faq.question}
            </dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {faq.answer}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-sm text-slate-600">
        ¿Prefieres aportar a instituciones de emergencia?{" "}
        <Link
          href="/donaciones"
          className="font-semibold text-[var(--brand-blue)] underline"
        >
          Consulta los canales oficiales
        </Link>
        .
      </p>
    </section>
  );
}
