import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  SPORT_EMOJI,
  SPORT_LABEL,
  type SportType,
  midnightInSaoPaulo,
  detectSportType,
} from "@/lib/gameUtils";
import { buildDeepLink } from "@/lib/utils";
import type { DailyGame } from "@/hooks/useDailyGames";

/** Escape WhatsApp markdown chars so wrapping in *…* doesn't break formatting. */
export function escapeWppMarkdown(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/([*_~`])/g, "\\$1");
}

/** Build WhatsApp-ready text for a list of games on a given date */
export function buildDayText(
  games: DailyGame[],
  dateStr: string,
  siteUrl: string,
): string | null {
  const filtered = (games ?? []).filter((g) => !g.archived);
  if (filtered.length === 0) return null;

  const spDate = midnightInSaoPaulo(dateStr);
  const dayLabel = format(spDate, "EEEE", { locale: ptBR });
  const [, m, d] = dateStr.split("-");

  const lines: string[] = [];
  lines.push(`📅 *${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}, ${d}/${m}*`);
  lines.push("");

  const bySport: Record<string, DailyGame[]> = {};
  filtered.forEach((g) => {
    const saved = g.sport_type || "football";
    const detected = detectSportType(`${g.competition} ${g.home_team} ${g.away_team}`);
    const key = detected !== "football" ? detected : saved;
    if (!bySport[key]) bySport[key] = [];
    bySport[key].push(g);
  });

  const sportOrder: string[] = [
    "football", "basketball", "volleyball", "tennis",
    "hockey", "baseball", "mma", "f1",
  ];
  const sortedSports = Object.keys(bySport).sort((a, b) => {
    const ia = sportOrder.indexOf(a);
    const ib = sportOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  for (const sport of sortedSports) {
    const sportGames = bySport[sport];
    const emoji = SPORT_EMOJI[sport as SportType] ?? "⚽";
    const label = SPORT_LABEL[sport as SportType] ?? sport.toUpperCase();
    lines.push(`${emoji} *${label.toUpperCase()}*`);

    const sorted = [...sportGames].sort((a, b) => a.game_time.localeCompare(b.game_time));
    for (const g of sorted) {
      const time = g.game_time.slice(0, 5);
      const home = escapeWppMarkdown(g.home_team);
      const away = escapeWppMarkdown(g.away_team);
      const teams = away ? `${home} x ${away}` : home;
      lines.push(`${time} — ${teams}`);

      const details: string[] = [];
      if (g.competition) {
        const comp = escapeWppMarkdown(g.competition);
        const detail = escapeWppMarkdown(g.competition_detail);
        details.push(detail ? `🏆 ${comp} · ${detail}` : `🏆 ${comp}`);
      }
      if (g.channels && g.channels.length > 0) {
        details.push(`📺 ${g.channels.map(escapeWppMarkdown).join(", ")}`);
      }
      if (details.length > 0) lines.push(details.join(" | "));
      lines.push("");
    }
  }

  // Include the selected date so the recipient lands on the exact day, not "Hoje".
  const shortLink = buildDeepLink(siteUrl, "schedule", { short: true });
  const sep = shortLink.includes("?") ? "&" : "?";
  lines.push(`👉 ${shortLink}${sep}date=${dateStr}`);
  return lines.join("\n").trim();
}

/** Build a short, share-friendly message with link to the public agenda page. */
export function buildShareMessage(
  games: DailyGame[],
  dateStr: string,
  siteUrl: string,
): string {
  const filtered = (games ?? []).filter((g) => !g.archived);
  const spDate = midnightInSaoPaulo(dateStr);
  const dayLabel = format(spDate, "EEEE", { locale: ptBR });
  const [, m, d] = dateStr.split("-");
  const today = (() => {
    const n = new Date();
    const y = n.getFullYear();
    const mm = String(n.getMonth() + 1).padStart(2, "0");
    const dd = String(n.getDate()).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  })();
  const tomorrow = offsetDateStr(today, 1);
  const heading =
    dateStr === today ? "AGENDA DE HOJE" :
    dateStr === tomorrow ? "AGENDA DE AMANHÃ" :
    `AGENDA ${d}/${m}`;

  const total = filtered.length;
  const lines: string[] = [];
  lines.push(`🔥 *${heading} — Canal do Brito*`);
  lines.push(
    `${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}, ${d}/${m} · ${total} ${total === 1 ? "jogo" : "jogos"}`,
  );

  if (total > 0) {
    const bySport: Record<string, number> = {};
    filtered.forEach((g) => {
      const saved = g.sport_type || "football";
      const detected = detectSportType(`${g.competition} ${g.home_team} ${g.away_team}`);
      const key = detected !== "football" ? detected : saved;
      bySport[key] = (bySport[key] ?? 0) + 1;
    });
    const top = Object.entries(bySport)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([s, n]) => `${SPORT_EMOJI[s as SportType] ?? "🏆"} ${n} ${SPORT_LABEL[s as SportType] ?? s}`)
      .join("  ");
    lines.push("");
    lines.push(top);
  }

  lines.push("");
  lines.push("Veja todos os jogos e canais 👇");
  lines.push(`${siteUrl}/programacao?date=${dateStr}`);
  return lines.join("\n").trim();
}

export interface DayValidation {
  total: number;
  active: number;
  noChannel: number;
  zeroTime: number;
  duplicates: number;
  problems: {
    noChannel: DailyGame[];
    zeroTime: DailyGame[];
    duplicates: DailyGame[];
  };
}

export function validateDay(games: DailyGame[]): DayValidation {
  const active = (games ?? []).filter((g) => !g.archived);
  const noChannel = active.filter((g) => !g.channels || g.channels.length === 0);
  const zeroTime = active.filter((g) => !g.game_time || g.game_time.startsWith("00:00"));
  const seen = new Map<string, DailyGame[]>();
  for (const g of active) {
    const k = `${g.home_team}|${g.away_team}|${g.game_time}`;
    if (!seen.has(k)) seen.set(k, []);
    seen.get(k)!.push(g);
  }
  const dupGroups = [...seen.values()].filter((arr) => arr.length > 1);
  const duplicates = dupGroups.flat();

  return {
    total: (games ?? []).length,
    active: active.length,
    noChannel: noChannel.length,
    zeroTime: zeroTime.length,
    duplicates: dupGroups.length,
    problems: { noChannel, zeroTime, duplicates },
  };
}

/**
 * Robust clipboard copy with execCommand fallback for iOS PWA / non-secure contexts.
 * Returns true on success.
 */
export async function safeCopy(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy fallback
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Get a date offset by N days from a reference date (YYYY-MM-DD, local). */
export function offsetDateStr(refStr: string, days: number): string {
  // Aritmética de calendário pura (UTC) — independe do fuso do navegador.
  const [y0, m0, d0] = refStr.split("-").map(Number);
  const d = new Date(Date.UTC(y0, (m0 || 1) - 1, (d0 || 1) + days));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
