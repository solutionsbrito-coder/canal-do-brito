import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildFullMessage, buildShortMessage, buildLiveMessage, buildUpcomingMessage, buildContentMessage, prepareGames,
} from "../whatsappFormats";
import { buildDeepLink } from "../utils";
import type { DailyGame } from "@/hooks/useDailyGames";

const DATE = "2026-09-04";
const LINK = "https://x.io/s/programacao?c=whatsapp-programacao-completa";

const g = (over: Partial<DailyGame> = {}): DailyGame => ({
  id: Math.random().toString(),
  date: DATE,
  home_team: "Flamengo",
  away_team: "Palmeiras",
  competition: "Brasileirão",
  competition_detail: null,
  game_time: "21:30:00",
  channels: ["Globo", "Premiere"],
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

// "Agora" = 20:00 em São Paulo (23:00Z) no dia DATE.
const NOW = new Date(`${DATE}T23:00:00Z`);
const opts = { dateStr: DATE, link: LINK, todayStr: DATE };

const useNow = () => { vi.useFakeTimers(); vi.setSystemTime(NOW); };
afterEach(() => vi.useRealTimers());

describe("prepareGames", () => {
  it("removes archived, inactive and duplicates", () => {
    const out = prepareGames([
      g({ id: "a" }), g({ id: "b" }), g({ id: "c", archived: true }), g({ id: "d", active: false, home_team: "X" }),
    ]);
    expect(out.map((x) => x.id)).toEqual(["a"]);
  });
});

describe("buildFullMessage", () => {
  it("groups live, next and by sport with normalized channels", () => {
    useNow();
    const r = buildFullMessage([
      g({ home_team: "Santos", away_team: "Grêmio", game_time: "19:30:00" }),          // ao vivo
      g({ game_time: "21:30:00" }),                                                     // próximo
      g({ home_team: "Lakers", away_team: "Celtics", competition: "NBA", game_time: "22:00:00", channels: ["ESPN 2"] }),
      g({ home_team: "Roland Garros — Final", away_team: "", competition: "Tênis", sport_type: "tennis", game_time: "10:00:00" }), // encerrado
    ], opts);
    expect(r.count).toBe(4);
    expect(r.text).toContain("📅 *Programação de hoje - 04/09*");
    expect(r.text.indexOf("🔴 *Ao vivo agora*")).toBeLessThan(r.text.indexOf("⏭️ *Próximos jogos*"));
    expect(r.text).toContain("19:30 - Santos x Grêmio");
    expect(r.text).toContain("📺 Globo, Premiere");
    expect(r.text).toContain("🎾 *Tênis*");
    expect(r.text).toContain("10:00 - Roland Garros — Final");
    expect(r.text).not.toContain("Final x");
    expect(r.text.trim().endsWith(LINK)).toBe(true);
  });
  it("returns fallback for empty day", () => {
    const r = buildFullMessage([], opts);
    expect(r.isFallback).toBe(true);
    expect(r.count).toBe(0);
    expect(r.text).toContain(LINK);
  });
  it("warns about games without channel", () => {
    useNow();
    const r = buildFullMessage([g({ channels: [] })], opts);
    expect(r.warnings.some((w) => w.includes("sem canal"))).toBe(true);
    expect(r.text).not.toContain("📺");
  });
  it("uses weekday for a future day and no live section", () => {
    useNow();
    const r = buildFullMessage([g({ date: "2026-09-05" })], { ...opts, dateStr: "2026-09-05" });
    expect(r.text).toContain("Programação de Sábado - 05/09");
    expect(r.text).not.toContain("Ao vivo agora");
  });
});

describe("buildShortMessage", () => {
  it("summarizes by sport and highlights live count", () => {
    useNow();
    const r = buildShortMessage([
      g({ game_time: "19:30:00" }),
      g({ home_team: "Lakers", away_team: "Celtics", competition: "NBA", game_time: "22:00:00" }),
    ], opts);
    expect(r.text).toContain("📺 *Jogos de hoje - 04/09*");
    expect(r.text).toContain("🔴 Ao vivo: 1");
    expect(r.text).toContain("⚽ Futebol: 1 jogo");
    expect(r.text).toContain("🏀 Basquete: 1 jogo");
    expect(r.text).not.toContain("Flamengo x Palmeiras");
  });
  it("highlights next game when nothing is live", () => {
    useNow();
    const r = buildShortMessage([g({ game_time: "21:30:00" })], opts);
    expect(r.text).toContain("⏭️ Próximo: 21:30 - Flamengo x Palmeiras");
  });
});

describe("buildLiveMessage", () => {
  it("lists live games only", () => {
    useNow();
    const r = buildLiveMessage([g({ game_time: "19:30:00" }), g({ home_team: "A", away_team: "B", game_time: "23:00:00" })], opts);
    expect(r.isFallback).toBe(false);
    expect(r.text).toContain("🔴 *Ao vivo agora no Canal do Brito*");
    expect(r.text).toContain("Flamengo x Palmeiras");
    expect(r.text).not.toContain("A x B");
  });
  it("falls back to upcoming when nothing is live", () => {
    useNow();
    const r = buildLiveMessage([g({ game_time: "23:00:00" })], opts);
    expect(r.isFallback).toBe(true);
    expect(r.text).toContain("No momento não há jogos ao vivo cadastrados.");
    expect(r.text).toContain("⏭️ *Próximos jogos:*");
    expect(r.text).toContain("23:00 - Flamengo x Palmeiras");
  });
});

describe("buildUpcomingMessage", () => {
  it("limits and orders by time", () => {
    useNow();
    const games = ["23:30:00", "21:00:00", "22:00:00", "22:30:00", "23:00:00", "21:30:00"].map((t, i) =>
      g({ home_team: `T${i}`, away_team: "Z", game_time: t }));
    const r = buildUpcomingMessage(games, { ...opts, limit: 3 });
    expect(r.count).toBe(3);
    expect(r.text.indexOf("21:00")).toBeLessThan(r.text.indexOf("21:30"));
    expect(r.text).not.toContain("23:30");
    expect(r.text).toContain("… e mais 3 jogos");
  });
  it("friendly fallback when nothing upcoming", () => {
    useNow();
    const r = buildUpcomingMessage([g({ game_time: "10:00:00" })], opts);
    expect(r.isFallback).toBe(true);
    expect(r.text).toContain("já começaram ou terminaram");
  });
});

describe("buildContentMessage", () => {
  it("prioritizes news, dedupes and limits", () => {
    const r = buildContentMessage({
      movies: [{ title: "Duna" }, { title: "Oppenheimer" }, { title: "Inativo", active: false }],
      series: [{ title: "The Bear" }],
      news: [{ title: "Duna" }, { title: "Shogun" }],
    }, { link: "https://x.io/s/filmes-e-series?c=whatsapp-filmes-series" });
    expect(r.text).toContain("🍿 *Filmes e séries da semana*");
    expect((r.text.match(/- Duna/g) ?? []).length).toBe(1);
    expect(r.text).toContain("- Shogun");
    expect(r.text).not.toContain("Inativo");
    expect(r.count).toBe(4);
  });
  it("fallback when empty", () => {
    const r = buildContentMessage({ movies: [], series: [], news: [] }, { link: "L" });
    expect(r.isFallback).toBe(true);
  });
});

describe("tracked links", () => {
  it("keeps whatsapp-* utm_content without tab prefix", () => {
    expect(buildDeepLink("https://x.io", "schedule", { short: true, content: "whatsapp-ao-vivo" }))
      .toBe("https://x.io/s/programacao?c=whatsapp-ao-vivo");
    expect(buildDeepLink("https://x.io", "novidades", { short: true, content: "whatsapp-filmes-series" }))
      .toBe("https://x.io/s/filmes-e-series?c=whatsapp-filmes-series");
  });
});
