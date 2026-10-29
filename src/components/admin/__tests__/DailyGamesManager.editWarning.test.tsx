import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InlineEditForm } from "../DailyGamesManager";

const baseGame = {
  id: "g1",
  date: "2026-10-30",
  home_team: "Flamengo",
  away_team: "Palmeiras",
  competition: "Brasileirão",
  competition_detail: "",
  game_time: "20:00",
  channels: ["Globo"],
  sport_type: "football",
  active: true,
  archived: false,
  is_live: false,
  is_womens: false,
  publish_at: null,
};

const otherGame = {
  id: "g2",
  date: "2026-10-30",
  home_team: "Flamengo",
  away_team: "Vasco",
  game_time: "21:00",
};

function renderForm(onSave = vi.fn()) {
  const utils = render(
    <InlineEditForm
      game={baseGame}
      suggestedSport="football"
      onSave={onSave}
      onCancel={() => {}}
      existingGames={[baseGame, otherGame] as any}
    />,
  );
  return { ...utils, onSave };
}

describe("aviso de duplicata na edição", () => {
  it("mostra duplicata provável e só salva após confirmar", () => {
    const { onSave } = renderForm();
    fireEvent.change(screen.getByPlaceholderText("Deixe vazio para evento único"), {
      target: { value: "Vasco" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByText(/Duplicata provável/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Salvar mesmo assim" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ away_team: "Vasco" }));
  });

  it("mostra conflito de horário sem duplicata", () => {
    const { container, onSave } = renderForm();
    const timeInput = container.querySelector('input[type="time"]') as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: "21:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByText(/Mesmo horário/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("salva direto quando não há aviso", () => {
    const { onSave } = renderForm();
    const compInput = screen.getByDisplayValue("Brasileirão") as HTMLInputElement;
    fireEvent.change(compInput, { target: { value: "Copa do Brasil" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ competition: "Copa do Brasil" }));
  });
});
