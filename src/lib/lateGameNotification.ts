import { getMinutesUntilStart } from "./gameUtils";

/**
 * Sino tardio (A4) — regra compartilhada entre o sino do card
 * (GameActions) e o sino compacto da agenda (DailyGamesSection).
 *
 * O servidor só dispara no tick de 15 min antes (janela de 13–17 min).
 * Abaixo de 13 min não há tick futuro que enviaria o aviso, então o
 * sino não deve criar um lembrete morto no servidor: o aviso sai na
 * hora, como notificação local, com o mesmo formato do push normal.
 * A partir de 13 min, o fluxo normal via servidor continua.
 *
 * Manter título/corpo/tag/ícone/vibração num só lugar: os dois sinos
 * não podem divergir no texto do aviso local.
 */

export interface LateBellGame {
  id: string;
  date: string;
  game_time: string;
  home_team: string;
  away_team: string | null;
  competition: string;
}

/** Limiar do A4: abaixo disto (e ainda futuro) o sino é tardio. */
export const LATE_BELL_THRESHOLD_MINUTES = 13;

/**
 * Minutos até o jogo quando ele é tardio; null nos demais casos
 * (fluxo normal, jogo ao vivo ou já passado).
 */
export function getLateBellMinutes(game: LateBellGame): number | null {
  const minutes = getMinutesUntilStart(game.game_time, game.date);
  if (minutes === null || minutes <= 0 || minutes >= LATE_BELL_THRESHOLD_MINUTES) return null;
  return minutes;
}

export function isLateBellGame(game: LateBellGame): boolean {
  return getLateBellMinutes(game) !== null;
}

export function lateGameNotificationTitle(minutes: number): string {
  return `Começa em ${minutes} min!`;
}

export function lateGameNotificationBody(game: LateBellGame): string {
  const title = game.away_team ? `${game.home_team} x ${game.away_team}` : game.home_team;
  return `${title} — ${game.competition}`;
}

/**
 * Exibe o aviso local imediato via service worker. Retorna true se a
 * notificação foi exibida; false se o navegador não suporta push ou
 * se a exibição falhar (quem chama decide o toast de erro).
 */
export async function showLateGameNotification(
  game: LateBellGame,
  minutes: number
): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(lateGameNotificationTitle(minutes), {
      body: lateGameNotificationBody(game),
      tag: `game-${game.id}-now`,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      vibrate: [200, 100, 200],
      renotify: true,
      data: { url: "/#esportes" },
    } as NotificationOptions & { vibrate: number[]; renotify: boolean });
    return true;
  } catch {
    return false;
  }
}
