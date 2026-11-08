import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { render } from "@testing-library/react";
import { TimeSection } from "../TimeSection";
import type { DailyGame } from "@/hooks/useDailyGames";
import type { GameStatus } from "@/lib/gameUtils";

// Mock framer-motion (GamePremiumCard renders motion.article)
vi.mock("framer-motion", () => {
  const make = (tag: string) =>
    ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, whileHover, whileTap, variants, layout, ...rest } = props;
      return createElement(tag, rest, children);
    };
  return {
    motion: new Proxy({}, { get: (_t, tag: string) => make(tag) }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Far-future date so every game is "upcoming" and more than 3h away:
// with statusById provided, all of them land in the "Mais tarde" bucket.
const DATE = "2099-01-01";

function game(partial: { id: string; home_team: string; away_team: string; game_time: string }): DailyGame {
  return {
    id: partial.id,
    date: DATE,
    home_team: partial.home_team,
    away_team: partial.away_team,
    competition: "Teste",
    competition_detail: null,
    game_time: partial.game_time,
    channels: [],
    is_live: false,
    is_womens: false,
    active: true,
    archived: false,
    status_short: "",
    elapsed_minutes: null,
    publish_at: null,
    sport_type: "football",
    created_at: "2099-01-01T00:00:00.000Z",
  };
}

describe("TimeSection ordering (dia esportivo)", () => {
  it("only the 00:00 game goes last in 'Mais tarde' — 00:10 stays on day D and sorts first", () => {
    const games = [
      game({ id: "1", home_team: "Portland Trail Blazers", away_team: "San Antonio Spurs", game_time: "00:00" }),
      game({ id: "2", home_team: "Flamengo", away_team: "Palmeiras", game_time: "20:00" }),
      game({ id: "3", home_team: "Corinthians", away_team: "São Paulo", game_time: "23:00" }),
      game({ id: "4", home_team: "Pumas", away_team: "América-MEX", game_time: "00:10" }),
      game({ id: "5", home_team: "Brasil", away_team: "Argentina", game_time: "10:00" }),
    ];
    const statusById = new Map<string, GameStatus>(games.map((g) => [g.id, "upcoming"]));

    const { container } = render(<TimeSection games={games} statusById={statusById} />);
    const section = container.querySelector('section[aria-label="Mais tarde"]');
    expect(section).not.toBeNull();
    const text = section!.textContent ?? "";
    // Only 00:00 moves to D+1 (PR #3): 00:10 stays on D at 00:10, so Pumas
    // sorts first, and the 00:00 Portland game goes last.
    const order = ["Pumas", "Brasil", "Flamengo", "Corinthians", "Portland Trail Blazers"]
      .map((name) => text.indexOf(name));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("a 23:00 game stays on day D and sorts before the dawn games", () => {
    const games = [
      game({ id: "1", home_team: "Portland Trail Blazers", away_team: "San Antonio Spurs", game_time: "00:00" }),
      game({ id: "2", home_team: "Corinthians", away_team: "São Paulo", game_time: "23:00" }),
    ];
    const statusById = new Map<string, GameStatus>(games.map((g) => [g.id, "upcoming"]));

    const { container } = render(<TimeSection games={games} statusById={statusById} />);
    const section = container.querySelector('section[aria-label="Mais tarde"]');
    expect(section).not.toBeNull();
    const text = section!.textContent ?? "";
    // 23:00 on D is earlier than 00:00 effective D+1, so Corinthians comes first.
    expect(text.indexOf("Corinthians")).toBeLessThan(text.indexOf("Portland Trail Blazers"));
  });
});
