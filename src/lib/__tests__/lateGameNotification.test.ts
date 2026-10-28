import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getLateBellMinutes,
  isLateBellGame,
  lateGameNotificationTitle,
  lateGameNotificationBody,
  showLateGameNotification,
  LATE_BELL_THRESHOLD_MINUTES,
} from "../lateGameNotification";
import type { DailyGame } from "@/hooks/useDailyGames";

function makeGame(game_time: string): DailyGame {
  return {
    id: "g1",
    date: "2026-10-28",
    home_team: "Teste A",
    away_team: "Teste B",
    competition: "Teste",
    competition_detail: null,
    game_time,
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
  };
}

describe("lateGameNotification — regra do sino tardio (A4)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-28T18:00:00-03:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("limiar é 13 min", () => {
    expect(LATE_BELL_THRESHOLD_MINUTES).toBe(13);
  });

  it("10 min antes: tardio", () => {
    expect(getLateBellMinutes(makeGame("18:10"))).toBe(10);
    expect(isLateBellGame(makeGame("18:10"))).toBe(true);
  });

  it("fronteira 13 min: fluxo normal, não tardio", () => {
    expect(getLateBellMinutes(makeGame("18:13"))).toBeNull();
    expect(isLateBellGame(makeGame("18:13"))).toBe(false);
  });

  it("jogo já começado: não tardio", () => {
    expect(getLateBellMinutes(makeGame("17:59"))).toBeNull();
    expect(isLateBellGame(makeGame("17:59"))).toBe(false);
  });

  it("título e corpo iguais aos do sino do card", () => {
    expect(lateGameNotificationTitle(10)).toBe("Começa em 10 min!");
    expect(lateGameNotificationBody(makeGame("18:10"))).toBe("Teste A x Teste B — Teste");
    expect(lateGameNotificationBody({ ...makeGame("18:10"), away_team: null })).toBe(
      "Teste A — Teste"
    );
  });

  it("showLateGameNotification exibe com tag, ícone, vibração longa, requireInteraction e renotify", async () => {
    const mockShow = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "serviceWorker", {
      value: { ready: Promise.resolve({ showNotification: mockShow }) },
      configurable: true,
    });
    await expect(showLateGameNotification(makeGame("18:10"), 10)).resolves.toBe(true);
    expect(mockShow).toHaveBeenCalledWith(
      "Começa em 10 min!",
      expect.objectContaining({
        body: "Teste A x Teste B — Teste",
        tag: "game-g1-now",
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        vibrate: [300, 100, 300, 100, 300],
        requireInteraction: true,
        renotify: true,
      })
    );
  });

  it("falha na exibição retorna false (quem chama mostra o erro honesto)", async () => {
    const mockShow = vi.fn(async () => {
      throw new Error("nope");
    });
    Object.defineProperty(navigator, "serviceWorker", {
      value: { ready: Promise.resolve({ showNotification: mockShow }) },
      configurable: true,
    });
    await expect(showLateGameNotification(makeGame("18:10"), 10)).resolves.toBe(false);
  });
});
