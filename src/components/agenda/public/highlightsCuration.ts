import type { DailyGame } from "@/hooks/useDailyGames";
import {
  detectSportType,
  getMinutesUntilStart,
  isGameCurrentlyLive,
  type SportType,
} from "@/lib/gameUtils";

/**
 * Regex de competições "imperdíveis". Usado em case-insensitive para priorização.
 */
const TOP_COMPETITIONS = /\b(brasileir[aã]o|libertadores|sul[- ]americana|copa do brasil|champions|premier league|la ?liga|serie a|bundesliga|ligue 1|europa league|conference league|world cup|copa do mundo|sele[çc][aã]o|nba|playoffs?|finais?|final|nfl|super ?bowl|ufc \d+|ufc fight night|ufc on|f[oó]rmula 1|gp d[aeo]|grande pr[eê]mio|wimbledon|roland garros|us open|australian open|atp finals|masters)\b/i;

const TOP_TEAMS = /\b(flamengo|palmeiras|corinthians|s[aã]o paulo|santos|fluminense|gr[eê]mio|internacional|atl[eé]tico|cruzeiro|botafogo|vasco|real madrid|barcelona|bayern|manchester|liverpool|chelsea|arsenal|psg|juventus|milan|inter|atletico madrid|borussia)\b/i;

export type Highlight = {
  game: DailyGame;
  /** minutos até o início (sempre > 0 para "Em Breve") */
  minutesUntil: number;
  /** prioridade que originou a inclusão */
  priority: "competition" | "team" | "upcoming";
};

/**
 * Retorna até `limit` jogos que ainda não começaram, ordenados pelo horário.
 * Prioriza competições e times grandes em caso de empate.
 * Exclui jogos ao vivo (já aparecem no LiveHeroCard) e encerrados.
 */
export function curateHighlights(games: DailyGame[], limit = 8): Highlight[] {
  const upcoming: Highlight[] = [];

  for (const g of games) {
    const sport = (g.sport_type || "football") as SportType;
    if (isGameCurrentlyLive(g.game_time, g.date, sport)) continue;
    const minutesUntil = getMinutesUntilStart(g.game_time, g.date);
    if (minutesUntil === null || minutesUntil <= 0) continue;

    const compText = `${g.competition} ${g.competition_detail ?? ""}`;
    const teamText = `${g.home_team} ${g.away_team ?? ""}`;
    const priority: Highlight["priority"] = TOP_COMPETITIONS.test(compText)
      ? "competition"
      : TOP_TEAMS.test(teamText)
        ? "team"
        : "upcoming";

    upcoming.push({ game: g, minutesUntil, priority });
  }

  const weight = { competition: 0, team: 1, upcoming: 2 } as const;
  upcoming.sort((a, b) => {
    if (a.minutesUntil !== b.minutesUntil) return a.minutesUntil - b.minutesUntil;
    return weight[a.priority] - weight[b.priority];
  });

  return upcoming.slice(0, limit);
}

export function detectedSport(g: DailyGame): SportType {
  const saved = (g.sport_type || "football") as SportType;
  const detected = detectSportType(`${g.competition} ${g.home_team} ${g.away_team}`);
  return detected !== "football" ? detected : saved;
}
