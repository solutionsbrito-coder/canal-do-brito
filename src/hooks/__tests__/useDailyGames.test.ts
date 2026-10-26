import { describe, it, expect } from "vitest";

// Replicate the same whitelist + sanitizer logic from useDailyGames.ts
// to validate behavior at the unit level (no Supabase round-trip).
const DAILY_GAMES_COLUMNS = new Set([
  "date", "home_team", "away_team", "competition", "competition_detail",
  "game_time", "channels", "is_live", "is_womens", "active", "archived",
  "status_short", "elapsed_minutes", "publish_at", "sport_type",
]);

function sanitizeGameStr(s: string): string {
  return s
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/[\u{1F3F4}\u{E0067}-\u{E007F}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeGame(game: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(game)) {
    if (!DAILY_GAMES_COLUMNS.has(key)) continue;
    if (typeof value === "string" && ["home_team","away_team","competition","competition_detail"].includes(key)) {
      out[key] = sanitizeGameStr(value);
    } else {
      out[key] = value;
    }
  }
  if (Array.isArray(out.channels)) {
    out.channels = out.channels.map((c: any) => typeof c === "string" ? sanitizeGameStr(c) : c);
  }
  return out;
}

describe("sanitizeGame whitelist", () => {
  it("removes UI-only fields (dateBumped, selected, sport_type-typo)", () => {
    const result = sanitizeGame({
      home_team: "Flamengo",
      away_team: "Palmeiras",
      game_time: "21:30",
      date: "2025-04-20",
      dateBumped: true,
      selected: true,
      randomField: "garbage",
    });
    expect(result).not.toHaveProperty("dateBumped");
    expect(result).not.toHaveProperty("selected");
    expect(result).not.toHaveProperty("randomField");
    expect(result.home_team).toBe("Flamengo");
    expect(result.away_team).toBe("Palmeiras");
  });

  it("preserves all valid columns", () => {
    const input = {
      date: "2025-04-20",
      home_team: "A",
      away_team: "B",
      competition: "Brasileirão",
      competition_detail: "Série A",
      game_time: "19:00",
      channels: ["Sportv"],
      is_live: false,
      is_womens: false,
      active: true,
      archived: false,
      status_short: "NS",
      elapsed_minutes: null,
      publish_at: "2025-04-20T03:00:00Z",
      sport_type: "football",
    };
    const result = sanitizeGame(input);
    for (const k of Object.keys(input)) {
      expect(result).toHaveProperty(k);
    }
  });

  it("strips broken surrogate pairs from team strings", () => {
    const result = sanitizeGame({
      home_team: "Time\uD800Quebrado",
      away_team: "Outro",
      competition: "X",
      competition_detail: "",
    });
    expect(result.home_team).toBe("TimeQuebrado");
  });

  it("sanitizes channel strings inside the array", () => {
    const result = sanitizeGame({
      home_team: "A",
      away_team: "B",
      channels: ["Canal\uD800X", "  ESPN  "],
    });
    expect(result.channels).toEqual(["CanalX", "ESPN"]);
  });

  it("returns empty object when no valid fields are present", () => {
    const result = sanitizeGame({ foo: 1, bar: 2 });
    expect(result).toEqual({});
  });
});
