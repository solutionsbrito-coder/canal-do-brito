import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextGameHero } from "../NextGameHero";
import type { DailyGame } from "@/hooks/useDailyGames";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

// Mock gameUtils to control time-based logic
vi.mock("@/lib/gameUtils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/gameUtils")>("@/lib/gameUtils");
  return {
    ...actual,
    isGameCurrentlyLive: vi.fn(() => false),
    getMinutesUntilStart: vi.fn(() => 60),
    formatCountdown: vi.fn((m: number) => `${m}min`),
  };
});

const makeGame = (overrides: Partial<DailyGame> = {}): DailyGame => ({
  id: "g1",
  date: "2026-04-06",
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
  created_at: "2026-04-06T00:00:00",
  ...overrides,
});

describe("NextGameHero", () => {
  it("renders next upcoming game with team names", () => {
    render(<NextGameHero games={[makeGame()]} />);
    expect(screen.getByText("Flamengo")).toBeInTheDocument();
    expect(screen.getByText("Palmeiras")).toBeInTheDocument();
  });

  it("shows competition name", () => {
    render(<NextGameHero games={[makeGame()]} />);
    expect(screen.getByText(/Brasileirão/)).toBeInTheDocument();
  });

  it("shows countdown", () => {
    render(<NextGameHero games={[makeGame()]} />);
    expect(screen.getByText("em 60min")).toBeInTheDocument();
  });

  it("renders channel badge", () => {
    render(<NextGameHero games={[makeGame()]} />);
    expect(screen.getByText("Globo")).toBeInTheDocument();
  });

  it("returns null when no upcoming games", async () => {
    const { isGameCurrentlyLive, getMinutesUntilStart } = await import("@/lib/gameUtils");
    (isGameCurrentlyLive as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (getMinutesUntilStart as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const { container } = render(<NextGameHero games={[makeGame()]} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null for empty games array", () => {
    const { container } = render(<NextGameHero games={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
