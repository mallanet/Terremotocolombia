/**
 * Modelos de la campaña de reconstrucción: puntos de recolección, responsables
 * de punto, compromisos de donación y lotes de salida.
 *
 * Los cuatro se gatean con la misma capacidad (`campaign:read` para ver), igual
 * que las tres tablas de voluntariado comparten `volunteer:read`: quien
 * coordina la campaña necesita las cuatro cosas o ninguna.
 */
import type { ModelConfig } from "../model-registry";

export const CAMPAIGN_MODELS = [
  {
    path: "campaign-sites",
    label: "Puntos de recolección",
    readCapability: "campaign:read",
    capabilityRoot: "campaign",
    columns: [
      { key: "city", label: "Ciudad" },
      { key: "name", label: "Punto" },
      { key: "address", label: "Dirección" },
      { key: "schedule", label: "Horario" },
      { key: "status", label: "Estado" },
    ],
    createFields: [
      { key: "city", label: "Ciudad", required: true },
      { key: "name", label: "Nombre del punto", required: true },
      { key: "address", label: "Dirección" },
      { key: "schedule", label: "Horario de atención" },
      { key: "publicContact", label: "Contacto público" },
      { key: "note", label: "Nota para quien dona" },
    ],
    editFields: [
      { key: "city", label: "Ciudad" },
      { key: "name", label: "Nombre del punto" },
      { key: "address", label: "Dirección" },
      { key: "schedule", label: "Horario de atención" },
      { key: "publicContact", label: "Contacto público" },
      { key: "status", label: "Estado (active | paused | full | closed)" },
      { key: "note", label: "Nota para quien dona" },
    ],
    canDelete: true,
  },
  {
    path: "campaign-stewards",
    label: "Responsables de punto",
    readCapability: "campaign:read",
    capabilityRoot: "campaign",
    columns: [
      { key: "city", label: "Ciudad" },
      { key: "siteName", label: "Punto" },
      { key: "displayName", label: "Responsable" },
      { key: "active", label: "Activo" },
      { key: "createdAt", label: "Alta" },
    ],
    // El token en claro sale UNA sola vez, en la respuesta del alta, y no se
    // puede volver a consultar: la base solo guarda su hash. Dar de baja a un
    // responsable lo desactiva, no borra las recepciones que confirmó.
    createFields: [
      {
        key: "siteId",
        label: "Punto",
        type: "select-model",
        optionsModel: "campaign-sites",
        optionLabelKey: "name",
        required: true,
      },
      { key: "displayName", label: "Nombre de la persona", required: true },
    ],
    revealOnCreate: ["token"],
    canDelete: true,
  },
  {
    path: "campaign-pledges",
    label: "Compromisos de donación",
    readCapability: "campaign:read",
    capabilityRoot: "campaign",
    columns: [
      { key: "code", label: "Código" },
      { key: "donorName", label: "Quien dona" },
      { key: "donorContact", label: "Contacto" },
      { key: "city", label: "Ciudad" },
      { key: "status", label: "Estado" },
      { key: "createdAt", label: "Fecha" },
    ],
    // Solo lectura: un compromiso lo cierra el responsable del punto cuando el
    // material llega. Si el panel pudiera marcarlo, "verificado" dejaría de
    // significar que alguien vio el material.
  },
  {
    path: "campaign-shipments",
    label: "Lotes enviados",
    readCapability: "campaign:read",
    capabilityRoot: "campaign",
    columns: [
      { key: "code", label: "Lote" },
      { key: "originCity", label: "Origen" },
      { key: "destName", label: "Destino" },
      { key: "status", label: "Estado" },
      { key: "createdAt", label: "Creado" },
    ],
    createFields: [
      { key: "originCity", label: "Ciudad de origen", required: true },
      { key: "destName", label: "Destino", required: true },
      { key: "carrierNote", label: "Nota del transporte" },
    ],
    editFields: [
      { key: "originCity", label: "Ciudad de origen" },
      { key: "destName", label: "Destino" },
      { key: "status", label: "Estado (loading | in_transit | delivered | cancelled)" },
      { key: "carrierNote", label: "Nota del transporte" },
    ],
    canDelete: true,
  },
] as const satisfies readonly ModelConfig[];
