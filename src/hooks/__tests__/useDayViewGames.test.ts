import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { makeQueryWrapper } from "@/test/queryWrapper";

// Controlável: linhas que o "Supabase" devolve e os argumentos do .in("date", ...).
const dbState = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  inArgs: [] as unknown[][],
}));

const fromMock = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: fromMock },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { useAllDailyGamesRange, useAllDailyGames } from "../useDailyGames";

/**
 * Builder encadeável mínimo do supabase-js, thenable como o real.
 * Aplica o filtro de data do servidor (.eq/.in em "date") para o teste
 * refletir o que o Supabase devolveria de fato.
 */
function installBuilder() {
  let allowedDates: string[] | null = null;
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.in = vi.fn((...args: unknown[]) => {
    dbState.inArgs.push(args);
    if (args[0] === "date" && Array.isArray(args[1])) allowedDates = args[1] as string[];
    return builder;
  });
  builder.eq = vi.fn((...args: unknown[]) => {
    if (args[0] === "date" && typeof args[1] === "string") allowedDates = [args[1]];
    return builder;
  });
  builder.order = vi.fn(() => builder);
  builder.abortSignal = vi.fn(() => builder);
  (builder as { then: unknown }).then = (resolve: (v: unknown) => void) =>
    resolve({
      data: allowedDates
        ? dbState.rows.filter((r) => allowedDates!.includes(r.date as string))
        : dbState.rows,
      error: null,
    });
  fromMock.mockReturnValue(builder);
  return builder;
}

const baseGame = (over: Record<string, unknown>) => ({
  id: "g",
  home_team: "Time A",
  away_team: "Time B",
  competition: "NBA",
  competition_detail: null,
  channels: ["ESPN 2"],
  is_live: false,
  is_womens: false,
  active: true,
  archived: false,
  status_short: "NS",
  elapsed_minutes: null,
  publish_at: null,
  sport_type: "basketball",
  created_at: "2026-11-06T00:00:00Z",
  source: "manual",
  ...over,
});

const rows = [
  baseGame({ id: "dawn-0700", date: "2026-11-07", game_time: "00:00", home_team: "Portland Trail Blazers", away_team: "San Antonio Spurs" }),
  baseGame({ id: "early-0400", date: "2026-11-07", game_time: "04:00", home_team: "Pumas", away_team: "América-MEX" }),
  baseGame({ id: "edge-0500", date: "2026-11-07", game_time: "05:00", home_team: "Time C", away_team: "Time D" }),
  baseGame({ id: "late-2300", date: "2026-11-07", game_time: "23:00", home_team: "Time E", away_team: "Time F" }),
  baseGame({ id: "own-0030", date: "2026-11-08", game_time: "00:30", home_team: "Time G", away_team: "Time H" }),
  baseGame({ id: "own-1000", date: "2026-11-08", game_time: "10:00", home_team: "Time I", away_team: "Time J" }),
];

describe("useAllDailyGamesRange — dawn carryover", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    dbState.rows = rows;
    dbState.inArgs = [];
    installBuilder();
  });

  it("view 08/11 includes only the previous-day 00:00 game (04:00 stays on 07/11) and excludes 23:00 and 05:00", async () => {
    const { result } = renderHook(() => useAllDailyGamesRange(["2026-11-08"]), {
      wrapper: makeQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const ids = (result.current.data ?? []).map((g) => g.id);
    expect(ids).toEqual(expect.arrayContaining(["dawn-0700", "own-0030", "own-1000"]));
    expect(ids).not.toContain("early-0400");
    expect(ids).not.toContain("late-2300");
    expect(ids).not.toContain("edge-0500");
  });

  it("fetches the previous day too (.in includes 2026-11-07)", async () => {
    const { result } = renderHook(() => useAllDailyGamesRange(["2026-11-08"]), {
      wrapper: makeQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const fetchedDates = dbState.inArgs.flat(2) as string[];
    expect(fetchedDates).toContain("2026-11-07");
    expect(fetchedDates).toContain("2026-11-08");
  });
});

describe("useAllDailyGames — includeDawnCarryover", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    dbState.rows = rows;
    dbState.inArgs = [];
    installBuilder();
  });

  it("with carryover, view 08/11 includes the 00:00 dawn game and excludes 23:00", async () => {
    const { result } = renderHook(
      () => useAllDailyGames("2026-11-08", { includeDawnCarryover: true }),
      { wrapper: makeQueryWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const ids = (result.current.data ?? []).map((g) => g.id);
    expect(ids).toContain("dawn-0700");
    expect(ids).toContain("own-1000");
    expect(ids).not.toContain("early-0400");
    expect(ids).not.toContain("late-2300");
    expect(ids).not.toContain("edge-0500");
  });

  it("without carryover (default, admin), only the exact date is returned", async () => {
    const { result } = renderHook(() => useAllDailyGames("2026-11-08"), {
      wrapper: makeQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const ids = (result.current.data ?? []).map((g) => g.id);
    expect(ids).toEqual(expect.arrayContaining(["own-0030", "own-1000"]));
    expect(ids).not.toContain("dawn-0700");
    expect(ids).not.toContain("late-2300");
  });
});
