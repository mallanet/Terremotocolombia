import { buildAcopioRouter } from "./acopio-module";

/**
 * Directorio de acopio siempre montado: lista estática de centros oficiales
 * del sismo + ResponseGrid opcional (ENABLE_RESPONSEGRID).
 */
export const acopioRouter = buildAcopioRouter();
