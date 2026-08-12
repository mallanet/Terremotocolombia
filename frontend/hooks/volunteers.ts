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

export type VolunteerOfferType =
  | "persona"
  | "insumos"
  | "dinero"
  | "maquinaria"
  | "transporte";

export interface VolunteerInput {
  name: string;
  contact: string; // WhatsApp o correo
  zone: string; // ciudad y país actual
  availability: string;
  offerTypes: VolunteerOfferType[];
  offer?: string; // detalles (insumos/dinero/maquinaria/transporte)
  digitalSkills?: string[];
  crisisExperience?: boolean;
  fieldCity?: string;
  rescueTraining?: boolean;
  fieldRole?: string;
  ownVehicle?: boolean;
  source?: string; // de dónde llegó: utm:*, referrer externo o "directo"
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
