/**
 * Registro de los modelos administrables (read-only en F1).
 *
 * Fuente de verdad ÚNICA del dashboard para: el path del backend
 * (/api/public/<path>), la capacidad que lo gatea (<path>:read), la etiqueta de
 * navegación y las columnas a mostrar. Espeja PUBLIC_RESOURCES del backend.
 *
 * Añadir un modelo nuevo = una entrada aquí (YAGNI: sin archivos por modelo
 * mientras la vista sea una tabla read-only genérica; cuando un modelo necesite
 * lógica de dominio propia, se extrae a su bounded-context dedicado).
 */

export interface ModelColumn {
  /** Clave del campo en el DTO del backend. */
  key: string;
  /** Encabezado visible. */
  label: string;
}

export interface ModelField {
  key: string;
  label: string;
  /**
   * `select-model`: un <select> poblado con las filas de otro modelo del
   * registro (p.ej. elegir hospital al crear un paciente, en vez de pegar un
   * UUID a mano). El value es el `id` de la fila elegida.
   */
  type?: "text" | "number" | "select-model";
  /** Para select-model: path del modelo que da las opciones. */
  optionsModel?: string;
  /** Para select-model: campo visible de la opción (default: name). */
  optionLabelKey?: string;
  required?: boolean;
}

export interface ModelConfig {
  /** Segmento de ruta: /api/public/<path> y /[path] en el dashboard. */
  path: string;
  /** Etiqueta de navegación (es). */
  label: string;
  /** Capacidad de lectura que lo gatea. */
  readCapability: string;
  /** Columnas a renderizar (las que existan en el DTO; el resto se ignora). */
  columns: ModelColumn[];
  capabilityRoot: string;
  createFields?: ModelField[];
  editFields?: ModelField[];
  canDelete?: boolean;
}

// Orden = orden en la navegación.
export const MODELS = [
  {
    path: "reports",
    label: "Reportes",
    readCapability: "report:read",
    capabilityRoot: "report",
    columns: [
      { key: "id", label: "ID" },
      { key: "type", label: "Tipo" },
      { key: "place", label: "Lugar" },
      { key: "affected", label: "Afectados" },
      { key: "confirmations", label: "Confirmaciones" },
    ],
    createFields: [
      { key: "type", label: "Tipo", required: true },
      { key: "lat", label: "Latitud", type: "number", required: true },
      { key: "lng", label: "Longitud", type: "number", required: true },
      { key: "place", label: "Lugar", required: true },
      { key: "affected", label: "Afectados", type: "number" },
      { key: "needs", label: "Necesidades" },
    ],
    editFields: [
      { key: "type", label: "Tipo" },
      { key: "lat", label: "Latitud", type: "number" },
      { key: "lng", label: "Longitud", type: "number" },
      { key: "place", label: "Lugar" },
      { key: "affected", label: "Afectados", type: "number" },
      { key: "needs", label: "Necesidades" },
    ],
    canDelete: true,
  },
  {
    path: "missing",
    label: "Desaparecidos",
    readCapability: "missing:read",
    capabilityRoot: "missing",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Nombre" },
      { key: "lastSeen", label: "Última ubicación" },
      { key: "status", label: "Estado" },
      // Presencia de cédula/documento (solo sí/—; el valor nunca se expone).
      // Ver services/missing.ts:MissingAdminDTO — solo en este camino gated.
      { key: "hasDocument", label: "Doc." },
    ],
    createFields: [
      { key: "name", label: "Nombre", required: true },
      { key: "age", label: "Edad", type: "number" },
      { key: "nationality", label: "Nacionalidad" },
      { key: "description", label: "Descripción" },
      { key: "lastSeen", label: "Última ubicación" },
      { key: "contact", label: "Contacto" },
    ],
    // La captura de cédula es SOLO edición (U12): la creación pública/staff de
    // un reporte sigue sin documento a propósito (captura pública diferida,
    // ver R10/R22).
    editFields: [
      { key: "name", label: "Nombre" },
      { key: "age", label: "Edad", type: "number" },
      { key: "nationality", label: "Nacionalidad" },
      { key: "description", label: "Descripción" },
      { key: "lastSeen", label: "Última ubicación" },
      { key: "contact", label: "Contacto" },
      {
        key: "tipoDocumento",
        label: "Tipo de documento (CC, TI, CE, PA, RC, NUIP o sin_documento)",
      },
      {
        key: "documentId",
        label:
          "Cédula / Documento (vacío = sin cambio). Solo se guarda una huella criptográfica, nunca el número.",
      },
    ],
    canDelete: true,
  },
  {
    path: "hospitals",
    label: "Hospitales",
    readCapability: "hospital:read",
    capabilityRoot: "hospital",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Nombre" },
      { key: "state", label: "Estado" },
      { key: "municipality", label: "Municipio" },
    ],
    createFields: [
      { key: "name", label: "Nombre", required: true },
      { key: "facilityType", label: "Tipo" },
      { key: "state", label: "Estado", required: true },
      { key: "municipality", label: "Municipio" },
      { key: "address", label: "Dirección" },
    ],
    editFields: [
      { key: "name", label: "Nombre" },
      { key: "facilityType", label: "Tipo" },
      { key: "state", label: "Estado" },
      { key: "municipality", label: "Municipio" },
      { key: "address", label: "Dirección" },
    ],
    canDelete: true,
  },
  {
    path: "patients",
    label: "Pacientes",
    readCapability: "patient:read",
    capabilityRoot: "patient",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Nombre" },
      { key: "hospitalId", label: "Hospital" },
      { key: "age", label: "Edad" },
      { key: "status", label: "Estado" },
      { key: "condition", label: "Condición" },
      // Presencia de cédula/documento (solo sí/—; el valor nunca se expone).
      { key: "hasDocument", label: "Doc." },
    ],
    createFields: [
      {
        key: "hospitalId",
        label: "Hospital",
        type: "select-model",
        optionsModel: "hospitals",
        optionLabelKey: "name",
        required: true,
      },
      { key: "name", label: "Nombre", required: true },
      { key: "age", label: "Edad", type: "number" },
      { key: "condition", label: "Condición" },
      { key: "status", label: "Estado" },
      { key: "notes", label: "Notas" },
      { key: "contact", label: "Contacto" },
      { key: "documentId", label: "Cédula / Documento" },
    ],
    // Todos los campos que se iteran al ganar confianza en el dato: la carga
    // inicial puede venir incompleta y se completa aquí (incl. cédula y
    // traslado de hospital). El documento no se prefill-ea (solo existe su
    // huella); dejarlo vacío = no tocarlo.
    editFields: [
      { key: "name", label: "Nombre" },
      {
        key: "hospitalId",
        label: "Hospital",
        type: "select-model",
        optionsModel: "hospitals",
        optionLabelKey: "name",
      },
      { key: "age", label: "Edad", type: "number" },
      { key: "condition", label: "Condición" },
      { key: "status", label: "Estado" },
      { key: "notes", label: "Notas" },
      { key: "contact", label: "Contacto" },
      { key: "documentId", label: "Cédula / Documento (vacío = sin cambio)" },
    ],
    canDelete: true,
  },
  {
    path: "donations",
    label: "Donaciones",
    readCapability: "donation:read",
    capabilityRoot: "donation",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Nombre" },
      { key: "amountCents", label: "Monto (centavos)" },
    ],
    createFields: [
      { key: "name", label: "Nombre", required: true },
      { key: "amountCents", label: "Monto (centavos)", type: "number", required: true },
    ],
  },
  {
    path: "chat",
    label: "Chat",
    readCapability: "chat:read",
    capabilityRoot: "chat",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Autor" },
      { key: "text", label: "Mensaje" },
    ],
    createFields: [
      { key: "name", label: "Autor" },
      { key: "text", label: "Mensaje", required: true },
      { key: "role", label: "Rol" },
      { key: "replyTo", label: "Respuesta a" },
    ],
    canDelete: true,
  },
  {
    path: "contact",
    label: "Contacto",
    readCapability: "contact:read",
    capabilityRoot: "contact",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Nombre" },
      { key: "subject", label: "Asunto" },
      { key: "read", label: "Leído" },
    ],
    createFields: [
      { key: "name", label: "Nombre", required: true },
      { key: "email", label: "Correo", required: true },
      { key: "subject", label: "Asunto", required: true },
      { key: "message", label: "Mensaje", required: true },
    ],
    editFields: [{ key: "read", label: "Leído (true)", required: true }],
  },
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
  {
    path: "deletion-requests",
    label: "Supresión de datos",
    readCapability: "deletion:read",
    capabilityRoot: "deletion",
    columns: [
      { key: "name", label: "Nombre" },
      { key: "email", label: "Correo" },
      { key: "details", label: "Detalle" },
      { key: "status", label: "Estado" },
    ],
    // Sin createFields: las solicitudes ENTRAN por el formulario público
    // (/solicitar-borrado). Aquí solo se resuelven (Ley 1581).
    editFields: [
      { key: "status", label: "Estado (pending | resolved | rejected)", required: true },
    ],
  },
] as const satisfies readonly ModelConfig[];

export type ModelPath = (typeof MODELS)[number]["path"];

export function getModel(path: string): ModelConfig | undefined {
  return MODELS.find((m) => m.path === path);
}
