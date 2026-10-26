/**
 * Geradores de mensagens de WhatsApp para a aba Admin › WhatsApp.
 *
 * Funções puras: recebem jogos já carregados (e canais já normalizados),
 * a data, o link rastreado e o "agora" — e devolvem o texto pronto.
 */
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  SPORT_EMOJI, SPORT_LABEL, type SportType,
  getGameStatus, isSingleEvent, midnightInSaoPaulo, detectSportType,
} from "@/lib/gameUtils";
import { escapeWppMarkdown } from "@/lib/whatsappText";
import type { DailyGame } from "@/hooks/useDailyGames";
import type { PublicTab } from "@/lib/utils";

export type WppFormatId = "completa" | "curta" | "ao-vivo" | "proximos" | "filmes-series";

export interface WppFormatMeta {
  id: WppFormatId;
  label: string;
  emoji: string;
  description: string;
  tab: PublicTab;
  /** utm_content / ?c= embutido no link curto. */
  utmContent: string;
}

export const WPP_FORMATS: WppFormatMeta[] = [
  { id: "completa", label: "Completa", emoji: "📅", description: "Todos os jogos do dia, por status e esporte", tab: "schedule", utmContent: "whatsapp-programacao-completa" },
  { id: "curta", label: "Curta", emoji: "📺", description: "Resumo rápido por esporte", tab: "schedule", utmContent: "whatsapp-programacao-curta" },
  { id: "ao-vivo", label: "Ao vivo", emoji: "🔴", description: "Só o que está rolando agora", tab: "schedule", utmContent: "whatsapp-ao-vivo" },
  { id: "proximos", label: "Próximos", emoji: "⏭️", description: "Os próximos jogos ainda não iniciados", tab: "schedule", utmContent: "whatsapp-proximos" },
  { id: "filmes-series", label: "Filmes/Séries", emoji: "🍿", description: "Destaques e novidades do catálogo", tab: "novidades", utmContent: "whatsapp-filmes-series" },
];

export const getFormatMeta = (id: WppFormatId): WppFormatMeta =>
  WPP_FORMATS.find((f) => f.id === id) ?? WPP_FORMATS[0];

export interface WppMessageResult {
  text: string;
  /** Quantidade de jogos/títulos incluídos na mensagem. */
  count: number;
  /** Avisos discretos para o admin (não vão na mensagem). */
  warnings: string[];
  /** true quando não havia conteúdo e a mensagem é um fallback amigável. */
  isFallback: boolean;
}

export interface BuildOpts {
  /** Data da programação (YYYY-MM-DD). */
  dateStr: string;
  /** Link rastreado (já com ?c= e &date= quando aplicável). */
  link: string;
  /** "Agora" — injetável para testes. */
  now?: Date;
  /** Data de hoje em São Paulo (YYYY-MM-DD) — injetável para testes. */
  todayStr?: string;
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const sportOf = (g: DailyGame): SportType => {
  const saved = (g.sport_type || "football") as SportType;
  const detected = detectSportType(`${g.competition} ${g.home_team} ${g.away_team}`);
  return detected !== "football" ? detected : saved;
};

const SPORT_ORDER: SportType[] = [
  "football", "basketball", "volleyball", "tennis", "mma", "boxing", "f1",
  "hockey", "baseball", "futsal", "handball", "rugby", "surf", "cycling",
  "swimming", "golf", "athletics", "gymnastics", "esports",
];

const sortSports = (a: string, b: string) => {
  const ia = SPORT_ORDER.indexOf(a as SportType);
  const ib = SPORT_ORDER.indexOf(b as SportType);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
};

const timeOf = (g: DailyGame) => (g.game_time || "00:00").slice(0, 5);

/** "Time A x Time B" ou só o título quando é evento único. */
export const matchupLine = (g: DailyGame): string => {
  const home = escapeWppMarkdown(g.home_team.trim());
  const away = escapeWppMarkdown((g.away_team ?? "").trim());
  return isSingleEvent(g) || !away ? home : `${home} x ${away}`;
};

const competitionLine = (g: DailyGame): string | null => {
  if (!g.competition?.trim()) return null;
  const comp = escapeWppMarkdown(g.competition.trim());
  const detail = escapeWppMarkdown(g.competition_detail?.trim());
  return detail ? `🏆 ${comp} · ${detail}` : `🏆 ${comp}`;
};

const channelsLine = (g: DailyGame): string | null => {
  const chans = (g.channels ?? []).map((c) => c.trim()).filter(Boolean);
  if (chans.length === 0) return null;
  return `📺 ${chans.map(escapeWppMarkdown).join(", ")}`;
};

/** Bloco padrão de um jogo: horário + confronto, competição, canais. */
const scoreSuffix = (g: DailyGame): string => {
  if (isSingleEvent(g) || typeof g.home_score !== "number" || typeof g.away_score !== "number") return "";
  const st = getGameStatus(g);
  if (st !== "live" && st !== "ended") return "";
  const clock = st === "live" ? [g.live_clock, g.period].map((p) => (p ?? "").trim()).filter(Boolean).join(" · ") : "";
  return ` (${g.home_score}-${g.away_score}${clock ? ` · ${escapeWppMarkdown(clock)}` : ""})`;
};

const gameBlock = (g: DailyGame, opts: { competition?: boolean } = {}): string[] => {
  const lines = [`${timeOf(g)} - ${matchupLine(g)}${scoreSuffix(g)}`];
  if (opts.competition !== false) {
    const c = competitionLine(g);
    if (c) lines.push(c);
  }
  const ch = channelsLine(g);
  if (ch) lines.push(ch);
  return lines;
};

const byTime = (a: DailyGame, b: DailyGame) => (a.game_time || "").localeCompare(b.game_time || "");

/** Remove arquivados/inativos e duplicados (mesmo confronto + horário). */
export function prepareGames(games: DailyGame[] | null | undefined): DailyGame[] {
  const seen = new Set<string>();
  const out: DailyGame[] = [];
  for (const g of games ?? []) {
    if (g.archived || g.active === false) continue;
    const key = `${g.home_team.trim().toLowerCase()}|${(g.away_team ?? "").trim().toLowerCase()}|${timeOf(g)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(g);
  }
  return out.sort(byTime);
}

const groupByStatus = (games: DailyGame[]) => {
  const live: DailyGame[] = [];
  const upcoming: DailyGame[] = [];
  const ended: DailyGame[] = [];
  for (const g of games) {
    const s = getGameStatus(g);
    if (s === "live") live.push(g);
    else if (s === "ended") ended.push(g);
    else upcoming.push(g);
  }
  return { live, upcoming, ended };
};

const dateLabels = (dateStr: string, todayStr: string) => {
  const [, m, d] = dateStr.split("-");
  const dm = `${d}/${m}`;
  const isToday = dateStr === todayStr;
  const weekday = format(midnightInSaoPaulo(dateStr), "EEEE", { locale: ptBR });
  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return { dm, isToday, weekdayCap, when: isToday ? "hoje" : weekdayCap.toLowerCase() };
};

const noChannelWarning = (games: DailyGame[]): string | null => {
  const n = games.filter((g) => !g.channels || g.channels.length === 0).length;
  return n > 0 ? `${n} jogo${n === 1 ? "" : "s"} sem canal — aparece${n === 1 ? "" : "m"} sem 📺 na mensagem.` : null;
};

const resolveToday = (opts: BuildOpts) => opts.todayStr ?? format(opts.now ?? new Date(), "yyyy-MM-dd");

/* ------------------------------------------------------------------ */
/* 1. Programação completa                                            */
/* ------------------------------------------------------------------ */

export function buildFullMessage(games: DailyGame[], opts: BuildOpts): WppMessageResult {
  const all = prepareGames(games);
  const { dm, isToday, weekdayCap } = dateLabels(opts.dateStr, resolveToday(opts));
  const warnings: string[] = [];

  if (all.length === 0) {
    return {
      text: `📅 *Programação de ${isToday ? "hoje" : weekdayCap} - ${dm}*\n\nAinda não há jogos publicados para este dia.\n\n👉 Ver agenda completa:\n${opts.link}`,
      count: 0, warnings: ["Nenhum jogo publicado nesta data."], isFallback: true,
    };
  }

  const lines: string[] = [];
  lines.push(`📅 *Programação de ${isToday ? "hoje" : weekdayCap} - ${dm}*`);
  lines.push("");

  const rest: DailyGame[] = [];
  if (isToday) {
    const { live, upcoming, ended } = groupByStatus(all);
    if (live.length > 0) {
      lines.push("🔴 *Ao vivo agora*");
      lines.push("");
      for (const g of live) { lines.push(...gameBlock(g)); lines.push(""); }
    }
    if (upcoming.length > 0) {
      lines.push("⏭️ *Próximos jogos*");
      lines.push("");
      const next = upcoming.slice(0, 3);
      for (const g of next) { lines.push(...gameBlock(g)); lines.push(""); }
      rest.push(...upcoming.slice(3));
    }
    rest.push(...ended);
  } else {
    rest.push(...all);
  }

  const bySport = new Map<string, DailyGame[]>();
  for (const g of rest) {
    const s = sportOf(g);
    if (!bySport.has(s)) bySport.set(s, []);
    bySport.get(s)!.push(g);
  }
  for (const sport of [...bySport.keys()].sort(sortSports)) {
    const list = bySport.get(sport)!.sort(byTime);
    lines.push(`${SPORT_EMOJI[sport as SportType] ?? "🏆"} *${SPORT_LABEL[sport as SportType] ?? sport}*`);
    lines.push("");
    for (const g of list) { lines.push(...gameBlock(g)); lines.push(""); }
  }

  lines.push("👉 Ver agenda completa:");
  lines.push(opts.link);

  const w = noChannelWarning(all);
  if (w) warnings.push(w);
  return { text: lines.join("\n").trim(), count: all.length, warnings, isFallback: false };
}

/* ------------------------------------------------------------------ */
/* 2. Versão curta                                                    */
/* ------------------------------------------------------------------ */

export function buildShortMessage(games: DailyGame[], opts: BuildOpts): WppMessageResult {
  const all = prepareGames(games);
  const { dm, isToday, weekdayCap } = dateLabels(opts.dateStr, resolveToday(opts));
  const head = `📺 *Jogos de ${isToday ? "hoje" : weekdayCap} - ${dm}*`;

  if (all.length === 0) {
    return {
      text: `${head}\n\nAinda não há jogos publicados para este dia.\n\n👉 ${opts.link}`,
      count: 0, warnings: ["Nenhum jogo publicado nesta data."], isFallback: true,
    };
  }

  const lines: string[] = [head, ""];
  if (isToday) {
    const { live, upcoming } = groupByStatus(all);
    if (live.length > 0) {
      lines.push(`🔴 Ao vivo: ${live.length}`);
      if (upcoming.length > 0) lines.push(`⏭️ Próximos: ${upcoming.length}`);
    } else if (upcoming.length > 0) {
      const n = upcoming[0];
      lines.push(`⏭️ Próximo: ${timeOf(n)} - ${matchupLine(n)}`);
      const ch = channelsLine(n);
      if (ch) lines.push(ch);
    }
    lines.push("");
  }

  const counts = new Map<string, number>();
  for (const g of all) counts.set(sportOf(g), (counts.get(sportOf(g)) ?? 0) + 1);
  for (const sport of [...counts.keys()].sort(sortSports)) {
    const n = counts.get(sport)!;
    lines.push(`${SPORT_EMOJI[sport as SportType] ?? "🏆"} ${SPORT_LABEL[sport as SportType] ?? sport}: ${n} ${n === 1 ? "jogo" : "jogos"}`);
  }
  lines.push("");
  lines.push("Veja horários e canais aqui:");
  lines.push(`👉 ${opts.link}`);

  const warnings: string[] = [];
  const w = noChannelWarning(all);
  if (w) warnings.push(w);
  return { text: lines.join("\n").trim(), count: all.length, warnings, isFallback: false };
}

/* ------------------------------------------------------------------ */
/* 3. Ao vivo agora                                                   */
/* ------------------------------------------------------------------ */

export function buildLiveMessage(games: DailyGame[], opts: BuildOpts): WppMessageResult {
  const all = prepareGames(games);
  const { live, upcoming } = groupByStatus(all);
  const warnings: string[] = [];

  if (live.length > 0) {
    const lines = ["🔴 *Ao vivo agora no Canal do Brito*", ""];
    for (const g of live) { lines.push(...gameBlock(g)); lines.push(""); }
    lines.push("👉 Ver todos:");
    lines.push(opts.link);
    const w = noChannelWarning(live);
    if (w) warnings.push(w);
    return { text: lines.join("\n").trim(), count: live.length, warnings, isFallback: false };
  }

  warnings.push("Nenhum jogo ao vivo agora — mensagem usa os próximos jogos.");
  const lines = ["No momento não há jogos ao vivo cadastrados.", ""];
  if (upcoming.length > 0) {
    lines.push("⏭️ *Próximos jogos:*");
    lines.push("");
    for (const g of upcoming.slice(0, 5)) { lines.push(...gameBlock(g, { competition: false })); lines.push(""); }
  } else {
    lines.push("Confira a agenda completa e os canais de cada jogo.");
    lines.push("");
    if (all.length === 0) warnings.push("Nenhum jogo publicado nesta data.");
  }
  lines.push("👉 Agenda completa:");
  lines.push(opts.link);
  return { text: lines.join("\n").trim(), count: Math.min(upcoming.length, 5), warnings, isFallback: true };
}

/* ------------------------------------------------------------------ */
/* 4. Próximos jogos                                                  */
/* ------------------------------------------------------------------ */

export function buildUpcomingMessage(games: DailyGame[], opts: BuildOpts & { limit?: number }): WppMessageResult {
  const all = prepareGames(games);
  const todayStr = resolveToday(opts);
  const { isToday, weekdayCap, dm } = dateLabels(opts.dateStr, todayStr);
  const limit = Math.max(1, Math.min(20, opts.limit ?? 5));
  // Em dias futuros, "próximos" = todos os jogos (nenhum começou).
  const upcoming = isToday ? groupByStatus(all).upcoming : all;
  const head = isToday ? "⏭️ *Próximos jogos de hoje*" : `⏭️ *Próximos jogos - ${weekdayCap}, ${dm}*`;

  if (upcoming.length === 0) {
    return {
      text: `${head}\n\n${all.length === 0 ? "Ainda não há jogos publicados para este dia." : "Todos os jogos de hoje já começaram ou terminaram."}\n\n👉 Agenda completa:\n${opts.link}`,
      count: 0,
      warnings: [all.length === 0 ? "Nenhum jogo publicado nesta data." : "Não há mais jogos por começar hoje."],
      isFallback: true,
    };
  }

  const picked = upcoming.slice(0, limit);
  const lines = [head, ""];
  for (const g of picked) { lines.push(...gameBlock(g)); lines.push(""); }
  if (upcoming.length > picked.length) {
    lines.push(`… e mais ${upcoming.length - picked.length} ${upcoming.length - picked.length === 1 ? "jogo" : "jogos"}`);
    lines.push("");
  }
  lines.push("👉 Agenda completa:");
  lines.push(opts.link);

  const warnings: string[] = [];
  const w = noChannelWarning(picked);
  if (w) warnings.push(w);
  return { text: lines.join("\n").trim(), count: picked.length, warnings, isFallback: false };
}

/* ------------------------------------------------------------------ */
/* 5. Filmes e séries                                                 */
/* ------------------------------------------------------------------ */

export interface ContentTitle { title: string; active?: boolean }

export function buildContentMessage(
  input: { movies: ContentTitle[]; series: ContentTitle[]; news: ContentTitle[] },
  opts: { link: string; perSection?: number },
): WppMessageResult {
  const per = Math.max(1, Math.min(8, opts.perSection ?? 4));
  const seen = new Set<string>();
  const pick = (arr: ContentTitle[]) => {
    const out: string[] = [];
    for (const it of arr) {
      if (it.active === false) continue;
      const t = it.title?.trim();
      if (!t) continue;
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(escapeWppMarkdown(t));
      if (out.length >= per) break;
    }
    return out;
  };

  // Novidades primeiro: são a prioridade e evitam repetir nos destaques.
  const news = pick(input.news);
  const movies = pick(input.movies);
  const series = pick(input.series);
  const count = news.length + movies.length + series.length;

  if (count === 0) {
    return {
      text: `🍿 *Filmes e séries da semana*\n\nEm breve novos destaques no catálogo.\n\n👉 Ver catálogo:\n${opts.link}`,
      count: 0, warnings: ["Nenhum filme, série ou novidade ativa."], isFallback: true,
    };
  }

  const lines = ["🍿 *Filmes e séries da semana*", ""];
  if (movies.length) { lines.push("🎬 Filmes em destaque:"); movies.forEach((t) => lines.push(`- ${t}`)); lines.push(""); }
  if (series.length) { lines.push("📺 Séries em destaque:"); series.forEach((t) => lines.push(`- ${t}`)); lines.push(""); }
  if (news.length) { lines.push("🆕 Novidades:"); news.forEach((t) => lines.push(`- ${t}`)); lines.push(""); }
  lines.push("👉 Ver catálogo:");
  lines.push(opts.link);
  return { text: lines.join("\n").trim(), count, warnings: [], isFallback: false };
}
