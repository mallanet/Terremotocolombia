import { describe, expect, it } from "vitest";
import {
  POST_SUBMIT_HEADING,
  POST_SUBMIT_PARAGRAPHS,
  shouldPreviewPostSubmit,
} from "@/components/features/volunteers/volunteer-post-submit";

describe("volunteer post-submit copy", () => {
  it("explica que Mallanet no asigna una tarea al registrarse", () => {
    expect(POST_SUBMIT_HEADING).toMatch(/coordinamos/i);
    expect(POST_SUBMIT_PARAGRAPHS.join(" ")).toMatch(/no es "asignarle una tarea"/);
    expect(POST_SUBMIT_PARAGRAPHS.join(" ")).toMatch(
      /aunque no recibas una asignación de inmediato/,
    );
  });

  it("agradece y pide paciencia", () => {
    expect(POST_SUBMIT_PARAGRAPHS.at(-1)).toMatch(/paciencia/i);
  });

  it("no activa la vista previa fuera de development", () => {
    expect(shouldPreviewPostSubmit()).toBe(false);
  });
});
