export const POST_SUBMIT_HEADING = "Cómo coordinamos tu registro";

export const POST_SUBMIT_PARAGRAPHS = [
  'Mallanet es una capa digital de coordinación, no una organización con oficinas ni personal contratado en territorio. El objetivo de cada interacción con un voluntario nuevo no es "asignarle una tarea", sino ubicarlo en el grupo correcto con las reglas correctas para que opere de forma autónoma.',
  "Nuestra prioridad es movilizar a nuestros voluntarios de la manera más eficiente posible, enfocando nuestros esfuerzos donde podamos generar el mayor impacto.",
  "Debido al alto volumen de personas dispuestas a ayudar, coordinamos y activamos voluntarios según las necesidades que van surgiendo, el tipo y volumen de trabajo disponible, la ubicación y la cantidad de voluntarios ya asignados.",
  "Registrarte es muy importante, aunque no recibas una asignación de inmediato. Tu información nos permite contar contigo cuando surja una necesidad en la que tu tiempo, ubicación o habilidades puedan tener el mayor impacto.",
  "Agradecemos profundamente tu disposición para ayudar y tu paciencia mientras coordinamos los esfuerzos de respuesta.",
] as const;

export const POST_SUBMIT_PREVIEW_MESSAGE =
  "Vista previa del mensaje posterior al registro.";

export function shouldPreviewPostSubmit(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("preview") === "post-submit";
}
