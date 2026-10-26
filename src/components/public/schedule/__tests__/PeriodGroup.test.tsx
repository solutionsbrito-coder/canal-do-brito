import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PeriodGroup } from "../PeriodGroup";
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

const games: DailyGame[] = [
  {
    id: "x1",
    date: "2026-05-06",
    home_team: "Time A",
    away_team: "Time B",
    competition: "Liga",
    competition_detail: null,
    game_time: "20:00",
    channels: [],
    is_live: false,
    is_womens: false,
    active: true,
    archived: false,
    status_short: "",
    elapsed_minutes: null,
    publish_at: null,
    sport_type: "football",
    created_at: "",
  },
];

describe("PeriodGroup", () => {
  it("shows period label and game count", () => {
    render(<PeriodGroup group="night" games={games} />);
    expect(screen.getByText(/noite/i)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders games when open by default", () => {
    render(<PeriodGroup group="night" games={games} />);
    expect(screen.getByText("Time A")).toBeInTheDocument();
  });

  it("collapses when trigger clicked", () => {
    render(<PeriodGroup group="night" games={games} />);
    const trigger = screen.getByRole("button", { name: /noite/i });
    fireEvent.click(trigger);
    // After collapse, content is hidden via Radix Collapsible (data-state)
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
