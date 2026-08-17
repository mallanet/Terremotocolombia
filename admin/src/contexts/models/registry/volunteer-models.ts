/**
 * Modelos de voluntariado del registro del panel. Extraídos de
 * model-registry.ts para que ese fichero siga siendo legible: la forma la
 * define ModelConfig y el orden de la navegación lo fija MODELS.
 */
import type { ModelConfig } from "../model-registry";

export const VOLUNTEER_MODELS = [
  {
    path: "volunteers",
    label: "Voluntarios",
    readCapability: "volunteer:read",
    capabilityRoot: "volunteer",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Nombre" },
      { key: "code", label: "Código" },
      { key: "contact", label: "Contacto" },
      { key: "zone", label: "Ciudad / país" },
      { key: "source", label: "Origen" },
      { key: "status", label: "Estado" },
    ],
    // Sin createFields: los voluntarios ENTRAN por el formulario público
    // (/voluntario). Aquí solo se gestiona el estado y las notas internas.
    // Sin canDelete: bandeja humanitaria, mismo criterio que
    // contact.resource.ts — no se borran registros por este endpoint.
    editFields: [
      {
        key: "status",
        label: "Estado (pending | contacted | active | declined)",
        required: true,
      },
      { key: "notes", label: "Notas internas" },
    ],
  },
  {
    path: "volunteer-tasks",
    label: "Tareas de voluntarios",
    readCapability: "volunteer:read",
    capabilityRoot: "volunteer",
    columns: [
      { key: "title", label: "Título" },
      { key: "kind", label: "Tipo" },
      { key: "city", label: "Ciudad" },
      { key: "originName", label: "Origen" },
      { key: "destName", label: "Destino" },
      { key: "status", label: "Estado" },
    ],
    createFields: [
      { key: "title", label: "Título", required: true },
      { key: "kind", label: "Tipo (digital | terreno)", required: true },
      { key: "city", label: "Ciudad" },
      { key: "description", label: "Descripción" },
      { key: "originName", label: "Punto de recogida (nombre)" },
      { key: "originLat", label: "Recogida latitud", type: "number" },
      { key: "originLng", label: "Recogida longitud", type: "number" },
      { key: "destName", label: "Punto de entrega (nombre)" },
      { key: "destLat", label: "Entrega latitud", type: "number" },
      { key: "destLng", label: "Entrega longitud", type: "number" },
      { key: "transportNote", label: "Nota de transporte (terminal, ruta, hora)" },
    ],
    editFields: [
      { key: "status", label: "Estado (open | assigned | done | cancelled)", required: true },
      { key: "transportNote", label: "Nota de transporte" },
    ],
    // Sin canDelete: una tarea se cancela por estado, no se borra.
  },
  {
    path: "volunteer-checkins",
    label: "Check-ins de voluntarios",
    readCapability: "volunteer:read",
    capabilityRoot: "volunteer",
    columns: [
      { key: "volunteerName", label: "Voluntario" },
      { key: "volunteerCode", label: "Código" },
      { key: "place", label: "Lugar" },
      { key: "note", label: "Qué dejó" },
      { key: "hasPhoto", label: "Foto" },
      { key: "createdAt", label: "Fecha" },
    ],
    // Solo lectura: los check-ins ENTRAN por la vía pública (/checkin con el
    // código del voluntario). Aquí el equipo solo verifica quién estuvo dónde.
  },
] as const satisfies readonly ModelConfig[];
