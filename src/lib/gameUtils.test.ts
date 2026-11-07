import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isGameCurrentlyLive, getLocalDateString, getElapsedMinutes, getMinutesUntilStart, getEffectiveGameDate, getGameStatus, isDawnGame, belongsToDayView, offsetDateString, detectSportType } from "./gameUtils";

/**
 * Helper: creates a Date that represents a specific time in São Paulo (UTC-3).
 * e.g. spDate(2026, 3, 19, 15, 30) → 15:30 BRT = 18:30 UTC
 */
function spDate(y: number, m: number, d: number, h: number, min: number): Date {
  return new Date(Date.UTC(y, m - 1, d, h + 3, min));
}

describe("getLocalDateString", () => {
  it("returns YYYY-MM-DD in São Paulo timezone", () => {
    // 2026-03-19 15:00 BRT = 2026-03-19 18:00 UTC
    const result = getLocalDateString(spDate(2026, 3, 19, 15, 0));
    expect(result).toBe("2026-03-19");
  });

  it("pads single-digit month and day", () => {
    const result = getLocalDateString(spDate(2026, 1, 5, 12, 0));
    expect(result).toBe("2026-01-05");
  });

  it("handles date boundary — 23:30 BRT is same day", () => {
    // 23:30 BRT = 02:30 UTC next day — but São Paulo date should still be the 19th
    const result = getLocalDateString(spDate(2026, 3, 19, 23, 30));
    expect(result).toBe("2026-03-19");
  });

  it("uses current date when no arg", () => {
    const result = getLocalDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("detectSportType", () => {
  it("detects basketball", () => {
    expect(detectSportType("NBA")).toBe("basketball");
    expect(detectSportType("NBB")).toBe("basketball");
    expect(detectSportType("EuroLeague")).toBe("basketball");
  });

  it("detects hockey", () => {
    expect(detectSportType("NHL")).toBe("hockey");
    expect(detectSportType("Hóquei no Gelo")).toBe("hockey");
    expect(detectSportType("Toronto Maple Leafs")).toBe("hockey");
    expect(detectSportType("Boston Bruins")).toBe("hockey");
  });

  it("detects baseball", () => {
    expect(detectSportType("MLB")).toBe("baseball");
    expect(detectSportType("Baseball")).toBe("baseball");
    expect(detectSportType("New York Yankees")).toBe("baseball");
    expect(detectSportType("Red Sox")).toBe("baseball");
  });

  it("does not misclassify ambiguous names", () => {
    // These names exist in multiple sports — should default to football
    expect(detectSportType("Rangers")).toBe("football");
    expect(detectSportType("Giants")).toBe("football");
    expect(detectSportType("Cardinals")).toBe("football");
  });

  it("detects tennis", () => {
    expect(detectSportType("ATP Finals")).toBe("tennis");
    expect(detectSportType("Roland Garros")).toBe("tennis");
    expect(detectSportType("WTA 1000")).toBe("tennis");
  });

  it("detects f1", () => {
    expect(detectSportType("Fórmula 1")).toBe("f1");
    expect(detectSportType("F1 GP")).toBe("f1");
    expect(detectSportType("Grande Prêmio")).toBe("f1");
    expect(detectSportType("Automobilismo")).toBe("f1");
    expect(detectSportType("MotoGP")).toBe("f1");
    expect(detectSportType("Moto2")).toBe("f1");
    expect(detectSportType("Moto3")).toBe("f1");
    expect(detectSportType("Formula E")).toBe("f1");
    expect(detectSportType("Formula-e")).toBe("f1");
    expect(detectSportType("Stock Car")).toBe("f1");
    expect(detectSportType("IndyCar")).toBe("f1");
    expect(detectSportType("E-Prix de São Paulo")).toBe("f1");
    expect(detectSportType("GP do Brasil")).toBe("f1");
  });

  it("detects mma", () => {
    expect(detectSportType("UFC 300")).toBe("mma");
    expect(detectSportType("Bellator")).toBe("mma");
  });

  it("detects volleyball", () => {
    expect(detectSportType("Superliga")).toBe("volleyball");
    expect(detectSportType("Vôlei")).toBe("volleyball");
  });

  it("detects rugby", () => {
    expect(detectSportType("Rugby Sevens")).toBe("rugby");
    expect(detectSportType("SVNS — Etapa de São Paulo")).toBe("rugby");
    expect(detectSportType("World Rugby")).toBe("rugby");
    expect(detectSportType("Super Rugby")).toBe("rugby");
  });

  it("detects surf", () => {
    expect(detectSportType("WSL Championship Tour")).toBe("surf");
    expect(detectSportType("Surf — Pipeline")).toBe("surf");
    expect(detectSportType("Tahiti Pro")).toBe("surf");
  });

  it("detects cycling", () => {
    expect(detectSportType("Tour de France")).toBe("cycling");
    expect(detectSportType("Giro d'Italia")).toBe("cycling");
    expect(detectSportType("Vuelta a España")).toBe("cycling");
    expect(detectSportType("Ciclismo")).toBe("cycling");
    expect(detectSportType("UCI World Tour")).toBe("cycling");
  });

  it("detects boxing", () => {
    expect(detectSportType("Boxe — WBC")).toBe("boxing");
    expect(detectSportType("WBA Championship")).toBe("boxing");
    expect(detectSportType("Box")).toBe("boxing");
  });

  it("detects swimming", () => {
    expect(detectSportType("Natação")).toBe("swimming");
    expect(detectSportType("World Aquatics")).toBe("swimming");
    expect(detectSportType("FINA")).toBe("swimming");
  });

  it("detects golf", () => {
    expect(detectSportType("PGA Tour")).toBe("golf");
    expect(detectSportType("Masters")).toBe("golf");
    expect(detectSportType("Ryder Cup")).toBe("golf");
    expect(detectSportType("Golfe")).toBe("golf");
  });

  it("defaults to football", () => {
    expect(detectSportType("Brasileirão")).toBe("football");
    expect(detectSportType("Champions League")).toBe("football");
    expect(detectSportType("La Liga")).toBe("football");
  });

  it("detects baseball from team names when competition is generic", () => {
    expect(detectSportType("21:30 | ESPN 4", "Los Angeles Dodgers Arizona Diamondbacks")).toBe("baseball");
  });

  it("detects tennis from team names when competition is generic", () => {
    expect(detectSportType("14:00 | ESPN 2", "ATP Tour")).toBe("tennis");
  });

  it("detects hockey from team names when competition is generic", () => {
    expect(detectSportType("22:00 | ESPN", "Toronto Maple Leafs Boston Bruins")).toBe("hockey");
  });
});

describe("isGameCurrentlyLive", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("returns true within 90min for football", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 15, 30));
    expect(isGameCurrentlyLive("15:00", "2026-03-19", "football")).toBe(true);
  });

  it("returns false after football duration+buffer (120min)", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 17, 0));
    expect(isGameCurrentlyLive("15:00", "2026-03-19", "football")).toBe(false);
  });

  it("returns false after basketball duration+buffer (165min)", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 17, 45));
    expect(isGameCurrentlyLive("15:00", "2026-03-19", "basketball")).toBe(false);
  });

  it("returns true within 48min for basketball", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 15, 47));
    expect(isGameCurrentlyLive("15:00", "2026-03-19", "basketball")).toBe(true);
  });

  it("returns true within 180min for tennis", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 17, 59));
    expect(isGameCurrentlyLive("15:00", "2026-03-19", "tennis")).toBe(true);
  });

  it("returns false after tennis duration+buffer (225min)", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 18, 45));
    expect(isGameCurrentlyLive("15:00", "2026-03-19", "tennis")).toBe(false);
  });

  it("returns true within 180min for mma", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 17, 59));
    expect(isGameCurrentlyLive("15:00", "2026-03-19", "mma")).toBe(true);
  });

  it("returns false after 195min (180+buffer) for mma", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 18, 15));
    expect(isGameCurrentlyLive("15:00", "2026-03-19", "mma")).toBe(false);
  });

  it("returns true within 120min for f1", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 16, 59));
    expect(isGameCurrentlyLive("15:00", "2026-03-19", "f1")).toBe(true);
  });

  it("defaults to football when no sportType", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 15, 30));
    expect(isGameCurrentlyLive("15:00", "2026-03-19")).toBe(true);
  });

  it("returns false before game starts", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 14, 59));
    expect(isGameCurrentlyLive("15:00", "2026-03-19")).toBe(false);
  });

  it("returns false for different date", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 15, 30));
    expect(isGameCurrentlyLive("15:00", "2026-03-20")).toBe(false);
  });
});

describe("getElapsedMinutes", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("returns elapsed minutes for football", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 15, 45));
    expect(getElapsedMinutes("15:00", "2026-03-19", "football")).toBe(45);
  });

  it("returns null after basketball duration+buffer", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 17, 45));
    expect(getElapsedMinutes("15:00", "2026-03-19", "basketball")).toBe(null);
  });

  it("returns elapsed for basketball within duration", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 15, 30));
    expect(getElapsedMinutes("15:00", "2026-03-19", "basketball")).toBe(30);
  });

  it("returns 0 at exact start", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 15, 0));
    expect(getElapsedMinutes("15:00", "2026-03-19")).toBe(0);
  });

  it("returns null before game", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 14, 59));
    expect(getElapsedMinutes("15:00", "2026-03-19")).toBe(null);
  });
});

describe("getMinutesUntilStart", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("returns minutes until a future game", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 14, 30));
    expect(getMinutesUntilStart("15:00", "2026-03-19")).toBe(30);
  });

  it("returns null for a game that already started", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 15, 1));
    expect(getMinutesUntilStart("15:00", "2026-03-19")).toBe(null);
  });

  it("returns minutes for a 23:00 game when it is 22:00 the same day", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 22, 0));
    expect(getMinutesUntilStart("23:00", "2026-03-19")).toBe(60);
  });
});

describe("sports day — dawn games (00:00–04:59) happen at the END of the programming day", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("effective date of a 00:00 game is the next day", () => {
    expect(getEffectiveGameDate("2026-03-20", "00:00")).toBe("2026-03-21");
    expect(getEffectiveGameDate("2026-03-20", "04:59")).toBe("2026-03-21");
  });

  it("effective date does not move for 05:00+ games", () => {
    expect(getEffectiveGameDate("2026-03-20", "05:00")).toBe("2026-03-20");
    expect(getEffectiveGameDate("2026-03-20", "23:00")).toBe("2026-03-20");
  });

  it("isDawnGame is true only before 05:00", () => {
    expect(isDawnGame("00:00")).toBe(true);
    expect(isDawnGame("04:59")).toBe(true);
    expect(isDawnGame("05:00")).toBe(false);
    expect(isDawnGame("23:00")).toBe(false);
  });

  it("a 00:00 game on day D is still upcoming at 23:00 on D-1 and at noon on D", () => {
    // Effective start is D+1 00:00: 25h away at 23:00 on D-1, 12h at noon on D.
    vi.setSystemTime(spDate(2026, 3, 19, 23, 0));
    expect(getMinutesUntilStart("00:00", "2026-03-20")).toBe(1500);
    vi.setSystemTime(spDate(2026, 3, 20, 12, 0));
    expect(getMinutesUntilStart("00:00", "2026-03-20")).toBe(720);
    expect(isGameCurrentlyLive("00:00", "2026-03-20", "football")).toBe(false);
  });

  it("a 00:00 game on day D is NOT live at 00:30 on D", () => {
    vi.setSystemTime(spDate(2026, 3, 20, 0, 30));
    expect(isGameCurrentlyLive("00:00", "2026-03-20", "football")).toBe(false);
    expect(getElapsedMinutes("00:00", "2026-03-20", "football")).toBe(null);
  });

  it("isGameCurrentlyLive returns true for 00:00 game at 00:30 on D+1", () => {
    vi.setSystemTime(spDate(2026, 3, 21, 0, 30));
    expect(isGameCurrentlyLive("00:00", "2026-03-20", "football")).toBe(true);
  });

  it("getElapsedMinutes returns 30 for 00:00 game at 00:30 on D+1", () => {
    vi.setSystemTime(spDate(2026, 3, 21, 0, 30));
    expect(getElapsedMinutes("00:00", "2026-03-20", "football")).toBe(30);
  });

  it("a 23:00 game is unchanged by the sports-day rule", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 23, 30));
    expect(isGameCurrentlyLive("23:00", "2026-03-19", "football")).toBe(true);
    expect(getElapsedMinutes("23:00", "2026-03-19", "football")).toBe(30);
  });
});

describe("offsetDateString", () => {
  it("shifts by -1 day across month and year boundaries", () => {
    expect(offsetDateString("2026-11-08", -1)).toBe("2026-11-07");
    expect(offsetDateString("2026-11-01", -1)).toBe("2026-10-31");
    expect(offsetDateString("2026-01-01", -1)).toBe("2025-12-31");
    expect(offsetDateString("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("shifts by +1 day", () => {
    expect(offsetDateString("2026-11-07", 1)).toBe("2026-11-08");
    expect(offsetDateString("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("belongsToDayView (dawn carryover)", () => {
  const dawn = { date: "2026-11-07", game_time: "00:00" };
  const late = { date: "2026-11-07", game_time: "23:00" };
  const edge = { date: "2026-11-07", game_time: "05:00" };

  it("a game belongs to its own day's view", () => {
    expect(belongsToDayView(dawn, "2026-11-07")).toBe(true);
    expect(belongsToDayView(late, "2026-11-07")).toBe(true);
  });

  it("a previous-day dawn game belongs to the next day's view", () => {
    expect(belongsToDayView(dawn, "2026-11-08")).toBe(true);
    expect(belongsToDayView({ date: "2026-11-07", game_time: "04:59" }, "2026-11-08")).toBe(true);
  });

  it("a previous-day late game does NOT belong to the next day's view", () => {
    expect(belongsToDayView(late, "2026-11-08")).toBe(false);
  });

  it("05:00 is not a dawn game, so it does NOT carry over", () => {
    expect(belongsToDayView(edge, "2026-11-08")).toBe(false);
  });

  it("a game from two days before does NOT belong", () => {
    expect(belongsToDayView(dawn, "2026-11-09")).toBe(false);
  });
});

describe("dawn carryover live window — Portland x Spurs, 07/11 00:00 (NBA)", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  const spurs = {
    date: "2026-11-07",
    game_time: "00:00",
    sport_type: "basketball",
    home_team: "Portland Trail Blazers",
    away_team: "San Antonio Spurs",
  };
  const lateGame = { date: "2026-11-07", game_time: "23:00", sport_type: "basketball" };

  it("at 00:30 on 08/11 the game is in the 08/11 view and live", () => {
    vi.setSystemTime(spDate(2026, 11, 8, 0, 30));
    expect(belongsToDayView(spurs, "2026-11-08")).toBe(true);
    expect(isGameCurrentlyLive(spurs.game_time, spurs.date, "basketball")).toBe(true);
    expect(getGameStatus(spurs)).toBe("live");
    expect(getElapsedMinutes(spurs.game_time, spurs.date, "basketball")).toBe(30);
  });

  it("at 12:00 on 08/11 the game is still in the view but ended (duration + buffer)", () => {
    vi.setSystemTime(spDate(2026, 11, 8, 12, 0));
    expect(belongsToDayView(spurs, "2026-11-08")).toBe(true);
    expect(isGameCurrentlyLive(spurs.game_time, spurs.date, "basketball")).toBe(false);
    expect(getGameStatus(spurs)).toBe("ended");
    expect(getElapsedMinutes(spurs.game_time, spurs.date, "basketball")).toBe(null);
  });

  it("at 10:00 on 07/11 the game is upcoming in the 07/11 view", () => {
    vi.setSystemTime(spDate(2026, 11, 7, 10, 0));
    expect(belongsToDayView(spurs, "2026-11-07")).toBe(true);
    expect(getGameStatus(spurs)).toBe("upcoming");
    expect(getMinutesUntilStart(spurs.game_time, spurs.date)).toBe(840);
  });

  it("a 23:00 game on 07/11 does NOT appear in the 08/11 view", () => {
    vi.setSystemTime(spDate(2026, 11, 8, 0, 30));
    expect(belongsToDayView(lateGame, "2026-11-08")).toBe(false);
  });
});
