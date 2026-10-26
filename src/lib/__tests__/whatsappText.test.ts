import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildDayText, validateDay, escapeWppMarkdown, safeCopy, offsetDateStr } from "../whatsappText";
import type { DailyGame } from "@/hooks/useDailyGames";

const g = (over: Partial<DailyGame> = {}): DailyGame => ({
  id: Math.random().toString(),
  date: "2026-05-07",
  home_team: "Flamengo",
  away_team: "Palmeiras",
  competition: "Brasileirão",
  competition_detail: null,
  game_time: "21:30:00",
  channels: ["Globo"],
  is_live: false,
  is_womens: false,
  active: true,
  archived: false,
  status_short: "NS",
  elapsed_minutes: null,
  publish_at: null,
  sport_type: "football",
  created_at: "",
  ...over,
});

describe("escapeWppMarkdown", () => {
  it("escapes *, _, ~, `", () => {
    expect(escapeWppMarkdown("FC *Star*")).toBe("FC \\*Star\\*");
    expect(escapeWppMarkdown("a_b~c`d")).toBe("a\\_b\\~c\\`d");
  });
  it("handles null/empty", () => {
    expect(escapeWppMarkdown(null)).toBe("");
    expect(escapeWppMarkdown("")).toBe("");
  });
});

describe("buildDayText", () => {
  it("returns null for empty list", () => {
    expect(buildDayText([], "2026-05-07", "https://x.io")).toBeNull();
  });
  it("ignores archived games", () => {
    expect(buildDayText([g({ archived: true })], "2026-05-07", "https://x.io")).toBeNull();
  });
  it("sorts by time within sport", () => {
    const txt = buildDayText(
      [g({ game_time: "22:00:00", home_team: "B" }), g({ game_time: "10:00:00", home_team: "A" })],
      "2026-05-07",
      "https://x.io",
    )!;
    expect(txt.indexOf("10:00")).toBeLessThan(txt.indexOf("22:00"));
  });
  it("escapes markdown in team/competition names", () => {
    const txt = buildDayText(
      [g({ home_team: "FC *Star*", competition: "Liga _X_" })],
      "2026-05-07",
      "https://x.io",
    )!;
    expect(txt).toContain("FC \\*Star\\*");
    expect(txt).toContain("Liga \\_X\\_");
  });
  it("groups by detected sport", () => {
    const txt = buildDayText(
      [g({ competition: "NBA", home_team: "Lakers", away_team: "Celtics" })],
      "2026-05-07",
      "https://x.io",
    )!;
    expect(txt).toMatch(/BASQUETE/);
  });
});

describe("validateDay", () => {
  it("counts noChannel/zeroTime/duplicates", () => {
    const v = validateDay([
      g({ id: "1", channels: [] }),
      g({ id: "2", game_time: "00:00:00" }),
      g({ id: "3", home_team: "X", away_team: "Y", game_time: "20:00:00" }),
      g({ id: "4", home_team: "X", away_team: "Y", game_time: "20:00:00" }),
    ]);
    expect(v.active).toBe(4);
    expect(v.noChannel).toBe(1);
    expect(v.zeroTime).toBe(1);
    expect(v.duplicates).toBe(1);
    expect(v.problems.duplicates).toHaveLength(2);
  });
  it("ignores archived", () => {
    const v = validateDay([g({ archived: true, channels: [] })]);
    expect(v.active).toBe(0);
    expect(v.noChannel).toBe(0);
  });
});

describe("safeCopy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  it("uses navigator.clipboard when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    expect(await safeCopy("hi")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hi");
  });
  it("falls back to execCommand on clipboard rejection", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });
    (document as any).execCommand = vi.fn().mockReturnValue(true);
    expect(await safeCopy("fallback")).toBe(true);
    expect((document as any).execCommand).toHaveBeenCalledWith("copy");
  });
});

describe("offsetDateStr", () => {
  it("returns +1 day", () => {
    expect(offsetDateStr("2026-05-07", 1)).toBe("2026-05-08");
  });
  it("returns +2 day across month boundary", () => {
    expect(offsetDateStr("2026-05-31", 2)).toBe("2026-06-02");
  });
});
