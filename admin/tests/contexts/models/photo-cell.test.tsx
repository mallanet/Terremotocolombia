import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { isPhotoValue, PhotoCell } from "@/src/contexts/models/ui/photo-cell";
import { renderCell } from "@/src/contexts/models/ui/model-cell";

/**
 * Regresión: la columna "Foto" de los compromisos volcaba su valor crudo en la
 * celda. Con la foto guardada como data-URL, eso son cientos de miles de
 * caracteres dentro de una tabla.
 */
const DATA_URL = "data:image/jpeg;base64,AAAA";
const CDN_URL = "https://cdn.example.org/campana/foto.jpg";

describe("celda con foto", () => {
  it("reconoce el data-URL y la URL del CDN", () => {
    expect(isPhotoValue(DATA_URL)).toBe(true);
    expect(isPhotoValue(CDN_URL)).toBe(true);
  });

  it("no confunde texto normal con una foto", () => {
    expect(isPhotoValue("Bogotá")).toBe(false);
    expect(isPhotoValue("https://example.org/pagina")).toBe(false);
    expect(isPhotoValue(null)).toBe(false);
  });

  it("colapsa la foto a una marca corta en el texto de la celda", () => {
    expect(renderCell(DATA_URL)).not.toContain("base64");
    expect(renderCell(DATA_URL).length).toBeLessThan(30);
  });

  it("pinta la miniatura enlazada a la imagen completa", () => {
    render(<PhotoCell value={CDN_URL} />);
    expect(screen.getByRole("img")).toHaveAttribute("src", CDN_URL);
    expect(screen.getByRole("link")).toHaveAttribute("href", CDN_URL);
  });
});
