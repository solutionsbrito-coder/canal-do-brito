import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { GameCard } from "../GameCard";
import type { DailyGame } from "@/hooks/useDailyGames";

vi.mock("@/lib/gameUtils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/gameUtils")>("@/lib/gameUtils");
  return {
    ...actual,
    isGameCurrentlyLive: vi.fn(() => false),
    getMinutesUntilStart: vi.fn(() => 240),
    formatCountdown: vi.fn((m: number) => `${m}min`),
  };
});

const makeGame = (overrides: Partial<DailyGame> = {}): DailyGame => ({
  id: "g1",
  date: "2026-05-06",
  home_team: "Flamengo",
  away_team: "Palmeiras",
  competition: "Brasileirão",
  competition_detail: null,
  game_time: "21:00",
  channels: ["Globo"],
  is_live: false,
  is_womens: false,
  active: true,
  archived: false,
  status_short: "",
  elapsed_minutes: null,
  publish_at: null,
  sport_type: "football",
  created_at: "2026-05-06T00:00:00",
  ...overrides,
});

describe("GameCard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders football game with both teams and competition", () => {
    render(<GameCard game={makeGame()} index={0} />);
    expect(screen.getByText("Flamengo")).toBeInTheDocument();
    expect(screen.getByText("Palmeiras")).toBeInTheDocument();
    expect(screen.getByText(/Brasileirão/)).toBeInTheDocument();
    expect(screen.getByText("21:00")).toBeInTheDocument();
    expect(screen.getByText(/futebol/i)).toBeInTheDocument();
  });

  it("renders sport label for basketball", () => {
    render(<GameCard game={makeGame({ sport_type: "basketball", competition: "NBA" })} index={0} />);
    expect(screen.getByText(/basquete/i)).toBeInTheDocument();
  });

  it("uses event layout (no vs) for non-adversarial sports like F1", () => {
    render(
      <GameCard
        game={makeGame({ sport_type: "f1", home_team: "GP de Mônaco", away_team: "" })}
        index={0}
      />
    );
    expect(screen.getByText("GP de Mônaco")).toBeInTheDocument();
    expect(screen.queryByText(/^vs$/i)).toBeNull();
  });

  it("shows AO VIVO badge when live", async () => {
    const { isGameCurrentlyLive } = await import("@/lib/gameUtils");
    (isGameCurrentlyLive as ReturnType<typeof vi.fn>).mockReturnValue(true);
    render(<GameCard game={makeGame()} index={0} />);
    expect(screen.getByText(/ao vivo/i)).toBeInTheDocument();
  });

  it("does NOT render reminder bell button", () => {
    render(<GameCard game={makeGame()} index={0} />);
    expect(screen.queryByLabelText(/lembrete/i)).toBeNull();
  });

  it("shows 'Sem transmissão confirmada' when no channels", () => {
    render(<GameCard game={makeGame({ channels: [] })} index={0} />);
    expect(screen.getByText(/sem transmissão confirmada/i)).toBeInTheDocument();
  });

  it("shows '+N' when more than 2 channels", () => {
    render(<GameCard game={makeGame({ channels: ["A", "B", "C", "D", "E"] })} index={0} />);
    expect(screen.getByText("+3")).toBeInTheDocument();
  });

  it("renders 'Onde assistir' label when there are channels", () => {
    render(<GameCard game={makeGame()} index={0} />);
    expect(screen.getByText(/onde assistir/i)).toBeInTheDocument();
  });
});
