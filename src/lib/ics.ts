import { SPORT_DURATION, type SportType } from "@/lib/gameUtils";

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** "2026-10-26" + "21:30" -> "20261026T213000" (hora local de Brasília). */
function toIcsLocal(date: string, time: string): string {
  const [y, m, d] = date.split("-");
  const [hh, mm] = (time || "00:00").slice(0, 5).split(":");
  return `${y}${m}${d}T${hh}${mm}00`;
}

function addMinutes(date: string, time: string, minutes: number): { date: string; time: string } {
  const [y, mo, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "00:00").slice(0, 5).split(":").map(Number);
  // Monta em UTC "ingênuo" e soma: o ICS usa TZID, então o deslocamento
  // de fuso não entra aqui — só precisamos da hora de término local.
  const dt = new Date(Date.UTC(y, mo - 1, d, hh, mm) + minutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`,
    time: `${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`,
  };
}

export interface IcsGame {
  id: string;
  date: string;
  game_time: string;
  home_team: string;
  away_team: string;
  competition: string;
  competition_detail?: string | null;
  channels?: string[];
  sport_type?: string | null;
}

/**
 * Gera um arquivo .ics para UM jogo. Download local, sem login, sem
 * conta e sem enviar nada a nenhum servidor: o visitante importa o
 * arquivo no Google Agenda / Apple Agenda e o lembrete passa a ser
 * do calendário dele (não depende do push do site).
 */
export function buildGameIcs(game: IcsGame): string {
  const title = game.away_team ? `${game.home_team} x ${game.away_team}` : game.home_team;
  const duration = SPORT_DURATION[(game.sport_type || "football") as SportType] ?? 105;
  const end = addMinutes(game.date, game.game_time, duration);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Canal do Brito//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${game.id}@canaldobrito.site`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART;TZID=America/Sao_Paulo:${toIcsLocal(game.date, game.game_time)}`,
    `DTEND;TZID=America/Sao_Paulo:${toIcsLocal(end.date, end.time)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(
      [
        game.competition,
        game.competition_detail || "",
        game.channels && game.channels.length > 0 ? `Onde assistir: ${game.channels.join(", ")}` : "",
        "Assistir no Canal do Brito",
      ]
        .filter(Boolean)
        .join(" — "),
    )}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

/** Baixa o .ics do jogo no navegador do visitante. */
export function downloadGameIcs(game: IcsGame): void {
  const blob = new Blob([buildGameIcs(game)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = `${game.home_team}${game.away_team ? `-x-${game.away_team}` : ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  a.href = url;
  a.download = `canal-do-brito-${game.date}-${slug || "jogo"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
