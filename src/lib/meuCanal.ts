/**
 * Meu Canal — preferências do visitante, SEM login.
 *
 * O app é informativo: o visitante não tem conta. O que ele segue fica
 * salvo apenas no dispositivo dele (localStorage), nunca no banco e
 * nunca associado a um user_id. Se ele trocar de aparelho ou limpar
 * os dados do navegador, os follows somem — isso é esperado e está
 * documentado na tela "Meus jogos".
 *
 * Um jogo "é do visitante" quando QUALQUER um destes bater:
 * - um dos times (casa ou visitante) está nos times seguidos;
 * - o esporte do jogo está nos esportes seguidos;
 * - a competição está nas competições seguidas.
 *
 * Comparação é insensível a acento/maiúsculas/espaços, mas guarda o
 * texto original para exibir ("Palmeiras", não "palmeiras").
 */

export interface MeuCanalPrefs {
  /** Nomes de times, como exibidos ("Palmeiras"). */
  teams: string[];
  /** Códigos de esporte (sport_type), ex.: "football", "basketball". */
  sports: string[];
  /** Nomes de competições, como exibidos ("Brasileirão"). */
  competitions: string[];
}

export const MEU_CANAL_STORAGE_KEY = "canalbrito:meu-canal:v1";

export const EMPTY_PREFS: MeuCanalPrefs = { teams: [], sports: [], competitions: [] };

export function normFollow(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function toggleIn(list: string[], value: string, byNorm = true): string[] {
  const key = byNorm ? normFollow(value) : value;
  const exists = list.some((v) => (byNorm ? normFollow(v) : v) === key);
  if (exists) return list.filter((v) => (byNorm ? normFollow(v) : v) !== key);
  return [...list, value];
}

export function loadMeuCanalPrefs(): MeuCanalPrefs {
  if (typeof window === "undefined") return { ...EMPTY_PREFS };
  try {
    const raw = window.localStorage.getItem(MEU_CANAL_STORAGE_KEY);
    if (!raw) return { ...EMPTY_PREFS };
    const parsed = JSON.parse(raw) as Partial<MeuCanalPrefs>;
    return {
      teams: Array.isArray(parsed.teams) ? parsed.teams.filter((v) => typeof v === "string") : [],
      sports: Array.isArray(parsed.sports) ? parsed.sports.filter((v) => typeof v === "string") : [],
      competitions: Array.isArray(parsed.competitions)
        ? parsed.competitions.filter((v) => typeof v === "string")
        : [],
    };
  } catch {
    return { ...EMPTY_PREFS };
  }
}

export function saveMeuCanalPrefs(prefs: MeuCanalPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MEU_CANAL_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Armazenamento indisponível (modo privado etc.): o follow vale só na sessão.
  }
}

export function toggleFollowTeam(prefs: MeuCanalPrefs, team: string): MeuCanalPrefs {
  return { ...prefs, teams: toggleIn(prefs.teams, team) };
}

export function toggleFollowSport(prefs: MeuCanalPrefs, sport: string): MeuCanalPrefs {
  return { ...prefs, sports: toggleIn(prefs.sports, sport, false) };
}

export function toggleFollowCompetition(prefs: MeuCanalPrefs, competition: string): MeuCanalPrefs {
  return { ...prefs, competitions: toggleIn(prefs.competitions, competition) };
}

export function isTeamFollowed(prefs: MeuCanalPrefs, team: string | null | undefined): boolean {
  const key = normFollow(team);
  return !!key && prefs.teams.some((t) => normFollow(t) === key);
}

export function isSportFollowed(prefs: MeuCanalPrefs, sport: string | null | undefined): boolean {
  return !!sport && prefs.sports.includes(sport);
}

export function isCompetitionFollowed(
  prefs: MeuCanalPrefs,
  competition: string | null | undefined,
): boolean {
  const key = normFollow(competition);
  return !!key && prefs.competitions.some((c) => normFollow(c) === key);
}

export function hasAnyFollow(prefs: MeuCanalPrefs): boolean {
  return prefs.teams.length > 0 || prefs.sports.length > 0 || prefs.competitions.length > 0;
}

export interface FollowableGame {
  home_team: string;
  away_team: string;
  competition: string;
  /** Esporte já resolvido (detectedSport) ou sport_type cru. */
  sport: string;
}

/** Verdadeiro quando o jogo bate em pelo menos um follow do visitante. */
export function matchesFollowed(game: FollowableGame, prefs: MeuCanalPrefs): boolean {
  if (!hasAnyFollow(prefs)) return false;
  if (isTeamFollowed(prefs, game.home_team) || isTeamFollowed(prefs, game.away_team)) return true;
  if (isSportFollowed(prefs, game.sport)) return true;
  if (isCompetitionFollowed(prefs, game.competition)) return true;
  return false;
}
