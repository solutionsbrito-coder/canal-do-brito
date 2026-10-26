import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BadgePill } from "../BadgePill";

describe("BadgePill", () => {
  it.each([
    ["lancamento", "Lançamento"],
    ["nova_temporada", "Nova Temporada"],
    ["estreia", "Estreia"],
    ["exclusivo", "Exclusivo"],
    ["movie", "Filme"],
    ["series", "Série"],
    ["tv", "Série"],
  ])("renders %s as '%s'", (type, label) => {
    render(<BadgePill type={type} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("falls back to 'Novidade' for unknown type", () => {
    render(<BadgePill type="unknown_type" />);
    expect(screen.getByText("Novidade")).toBeInTheDocument();
  });
});
