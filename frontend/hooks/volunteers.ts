"use client";

/**
 * Hooks de datos del dominio "volunteers". Mismo patrón canónico que hooks/contact.ts.
 *
 *  - mutación: useMutation + apiSend; el contrato JSON espeja el del backend.
 *  - NADA de fetch/setState a mano en el componente: solo este hook.
 *
 * El registro de voluntario es fire-and-forget (no hay lecturas que listar en
 * el sitio público), por eso solo exporta una mutación.
 */
import { useMutation } from "@tanstack/react-query";
import { apiSend } from "@/lib/api";

export interface VolunteerInput {
  name: string;
  phone: string;
  offer: string;
  zone: string;
  turnstileToken?: string; // prueba de humanidad (Turnstile) para el backend
}

export interface VolunteerResponse {
  message?: string;
}

export function useVolunteerSubmit() {
  return useMutation({
    mutationFn: (input: VolunteerInput) =>
      apiSend<VolunteerResponse>("POST", "/api/volunteers", input),
  });
}
