import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VolunteerFicha } from "@/src/contexts/volunteers/volunteer-ficha";
import { fichaFieldKeys } from "@/src/contexts/volunteers/ficha-fields";

const row = {
  id: "vol-1",
  name: "DEMO-Voluntaria",
  code: "000001",
  zone: "DEMO-Ciudad",
  contact: "demo@example.org",
  availability: "10 h/semana",
  offerTypes: ["persona", "transporte"],
  offer: "",
  digitalSkills: ["Traducción"],
  fieldCity: null,
  fieldRole: null,
  rescueTraining: false,
  crisisExperience: true,
  ownVehicle: true,
  source: "directo",
  notes: null,
  createdAt: 1_760_000_000_000,
  updatedAt: null,
};

describe("VolunteerFicha", () => {
  it("muestra los datos que la tabla no lista", () => {
    render(<VolunteerFicha row={row} onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "DEMO-Voluntaria" })).toBeInTheDocument();
    expect(screen.getByText("10 h/semana")).toBeInTheDocument();
    expect(screen.getByText("Su tiempo y habilidades, Transporte")).toBeInTheDocument();
    expect(screen.getByText("Traducción")).toBeInTheDocument();
  });

  it("traduce booleanos y deja em dash en los campos vacíos", () => {
    render(<VolunteerFicha row={row} onClose={vi.fn()} />);
    expect(screen.getAllByText("sí").length).toBeGreaterThan(0);
    expect(screen.getByText("no")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("cierra al pulsar el botón", async () => {
    const onClose = vi.fn();
    render(<VolunteerFicha row={row} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Cerrar ficha" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("pide al BFF cada campo que la ficha pinta", () => {
    expect(fichaFieldKeys()).toContain("availability");
    expect(fichaFieldKeys()).toContain("offerTypes");
    expect(fichaFieldKeys()).toContain("createdAt");
  });
});
