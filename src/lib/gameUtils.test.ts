import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isGameCurrentlyLive, getLocalDateString, getElapsedMinutes, getMinutesUntilStart, detectSportType } from "./gameUtils";

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

  it("returns minutes for a midnight game when it is 23:00 the day before", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 23, 0));
    expect(getMinutesUntilStart("00:00", "2026-03-20")).toBe(60);
  });

  it("returns minutes for a 00:30 game when it is 23:50 the day before", () => {
    vi.setSystemTime(spDate(2026, 3, 19, 23, 50));
    expect(getMinutesUntilStart("00:30", "2026-03-20")).toBe(40);
  });
});

describe("midnight game scenarios", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("isGameCurrentlyLive returns true for 00:00 game at 00:30", () => {
    vi.setSystemTime(spDate(2026, 3, 20, 0, 30));
    expect(isGameCurrentlyLive("00:00", "2026-03-20", "football")).toBe(true);
  });

  it("getElapsedMinutes returns 30 for 00:00 game at 00:30", () => {
    vi.setSystemTime(spDate(2026, 3, 20, 0, 30));
    expect(getElapsedMinutes("00:00", "2026-03-20", "football")).toBe(30);
  });
});
