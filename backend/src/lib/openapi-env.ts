/**
 * Dummy env so OpenAPI generation can import route modules without a live
 * database. Must run before any import of `config/env`.
 */
export function ensureOpenApiGenerateEnv(): void {
  process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ?? "postgres://mapa_app:localdev@localhost:5432/app";
  process.env.JWT_SECRET =
    process.env.JWT_SECRET ?? "test-jwt-secret-not-for-prod-0123456789";
  process.env.PATIENT_DOCUMENT_HASH_SECRET =
    process.env.PATIENT_DOCUMENT_HASH_SECRET ??
    "test-patient-document-hash-secret-0123456789";
}
