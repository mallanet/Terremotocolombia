import type { FaqEntry } from "@/lib/jsonld";

/**
 * Preguntas frecuentes de la campaña, visibles y emitidas como FAQPage.
 *
 * Las dos cosas salen de este mismo array a propósito: un FAQPage que no
 * coincide con lo que la página muestra es marcado engañoso, y Google lo
 * penaliza. Si cambias una respuesta aquí, cambia en los dos sitios a la vez.
 *
 * Cada respuesta se sostiene en algo del sistema, no en una promesa
 * comercial: el catálogo de materiales, el código de diez caracteres, la
 * verificación por parte del punto y las tres cifras que nunca se suman.
 */
export const CAMPAIGN_FAQS: FaqEntry[] = [
  {
    question: "¿Qué materiales de construcción puedo donar?",
    answer:
      "Cemento en sacos de 50 kg, varilla o hierro, ladrillo o bloque, arena o gravilla, teja o cubierta, madera y herramienta. Si lo que llevas no está en esa lista, regístralo como «otro material» y descríbelo al registrar la donación.",
  },
  {
    question: "¿Tengo que registrar la donación antes de llevar el material?",
    answer:
      "Sí, y toma un minuto. Al registrarla recibes un código de diez caracteres. Ese código es lo que permite que la persona del punto confirme tu entrega, y es lo que hace que las cifras públicas signifiquen algo.",
  },
  {
    question: "¿Cómo sé que mi entrega quedó confirmada?",
    answer:
      "Con tu código abres tu certificado. Empieza como pendiente y pasa a verificado solo cuando alguien del punto confirma que recibió el material. Nadie puede dar por verificada su propia entrega.",
  },
  {
    question: "¿Las cifras de la campaña incluyen lo que la gente prometió?",
    answer:
      "No se suman nunca. La página muestra por separado el material recibido (que alguien del equipo vio y confirmó), el prometido que todavía no llega, y el que ya salió hacia el destino. Sumarlos convertiría una promesa en un hecho.",
  },
  {
    question: "¿A dónde va el material que se recoge?",
    answer:
      "A familias del Chocó que perdieron su vivienda con el terremoto. Sale por lotes desde los puntos de recolección, y lo que ya va en camino aparece en el tablero como material en tránsito.",
  },
  {
    question: "¿Aparece mi nombre públicamente si dono?",
    answer:
      "Solo si lo pides. El muro de donantes es opcional: si no marcas la casilla, el sistema no guarda ningún alias, así que no hay nada que publicar. Tu contacto no es público en ningún caso.",
  },
];

export default function CampaignFaq() {
  return (
    <section id="preguntas" className="mb-12 scroll-mt-24">
      <h2 className="mb-4 text-xl font-bold text-slate-900">
        Preguntas frecuentes
      </h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        {CAMPAIGN_FAQS.map((faq) => (
          <div
            key={faq.question}
            className="rounded-[20px] bg-slate-50 p-5"
          >
            <dt className="text-sm font-semibold text-slate-900">
              {faq.question}
            </dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {faq.answer}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
