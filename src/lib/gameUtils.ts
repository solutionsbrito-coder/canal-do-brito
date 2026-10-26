export type SportType = 'football' | 'futsal' | 'basketball' | 'tennis' | 'f1' | 'mma' | 'volleyball' | 'handball' | 'hockey' | 'baseball' | 'rugby' | 'surf' | 'cycling' | 'boxing' | 'swimming' | 'golf' | 'athletics' | 'gymnastics' | 'esports';

/** Realistic duration in minutes per sport (includes halftime, timeouts, stoppages) */
export const SPORT_DURATION: Record<SportType, number> = {
  football: 105,
  futsal: 90,
  basketball: 150,
  tennis: 210,
  f1: 130,
  mma: 180,
  volleyball: 120,
  handball: 100,
  hockey: 150,
  baseball: 210,
  rugby: 100,
  surf: 240,
  cycling: 300,
  boxing: 90,
  swimming: 180,
  golf: 300,
  athletics: 180,
  gymnastics: 180,
  esports: 180,
};

/** Extra buffer after duration ends to cover delays/overtime */
export const LIVE_BUFFER_MINUTES = 15;

/** Sport emoji map */
export const SPORT_EMOJI: Record<SportType, string> = {
  football: '⚽',
  futsal: '🥅',
  basketball: '🏀',
  tennis: '🎾',
  f1: '🏎️',
  mma: '🥊',
  volleyball: '🏐',
  handball: '🤾',
  hockey: '🏒',
  baseball: '⚾',
  rugby: '🏉',
  surf: '🏄',
  cycling: '🚴',
  boxing: '🥊',
  swimming: '🏊',
  golf: '⛳',
  athletics: '🏃',
  gymnastics: '🤸',
  esports: '🎮',
};

/** Sport label map */
export const SPORT_LABEL: Record<SportType, string> = {
  football: 'Futebol',
  futsal: 'Futsal',
  basketball: 'Basquete',
  tennis: 'Tênis',
  f1: 'Automobilismo',
  mma: 'MMA',
  volleyball: 'Vôlei',
  handball: 'Handebol',
  hockey: 'Hóquei',
  baseball: 'Baseball',
  rugby: 'Rugby',
  surf: 'Surf',
  cycling: 'Ciclismo',
  boxing: 'Boxe',
  swimming: 'Natação',
  golf: 'Golf',
  athletics: 'Atletismo',
  gymnastics: 'Ginástica',
  esports: 'eSports',
};

/** Sports that don't have two adversarial teams (e.g. motorsport) */
const NON_ADVERSARIAL: SportType[] = ['f1', 'tennis', 'mma', 'surf', 'cycling', 'swimming', 'golf', 'athletics', 'gymnastics'];
export const isNonAdversarial = (st: SportType): boolean => NON_ADVERSARIAL.includes(st);

/** Textual hints that an entry is a single event (no "x" between two sides). */
const SINGLE_EVENT_RE = /\b(etapa|todas as quadras|gp\b|grande pr[eê]mio|round\s*\d|rodada|corrida|treino|classifica[cç][aã]o|sprint|final(?:\s+\w+)?$|maratona|prova|sess[aã]o|card\b|ufc\s*\d|dia\s*\d|torneio|open\b)/i;

/**
 * Decide whether a game should be rendered as a single event (title only)
 * instead of a "home x away" confrontation.
 */
export function isSingleEvent(g: { home_team: string; away_team?: string | null; sport_type?: string | null }): boolean {
  if (!g.away_team || !g.away_team.trim()) return true;
  if (g.away_team.trim().toLowerCase() === g.home_team.trim().toLowerCase()) return true;
  if (isNonAdversarial((g.sport_type || 'football') as SportType)) return true;
  return SINGLE_EVENT_RE.test(g.home_team) && !/\bx\b|\bvs\b/i.test(g.home_team);
}

export type GameStatus = 'live' | 'soon' | 'upcoming' | 'ended';

export function getGameStatus(
  g: { game_time: string; date: string; sport_type?: string | null },
  soonMinutes = 60,
): GameStatus {
  const st = (g.sport_type || 'football') as SportType;
  if (isGameCurrentlyLive(g.game_time, g.date, st)) return 'live';
  const mins = getMinutesUntilStart(g.game_time, g.date);
  if (mins === null) return 'ended';
  return mins <= soonMinutes ? 'soon' : 'upcoming';
}

export function formatScore(g: { home_score?: number | null; away_score?: number | null }): string | null {
  if (typeof g.home_score !== 'number' || typeof g.away_score !== 'number') return null;
  return `${g.home_score} x ${g.away_score}`;
}


/** Detect sport type from competition name and optional team names */
export function detectSportType(competition: string, teamNames?: string): SportType {
  const c = `${competition} ${teamNames || ''}`.toLowerCase();
  if (/\b(nba|nbb|euroleague|wnba|basquete)\b/i.test(c)) return 'basketball';
  if (/\b(nhl|h[oó]quei|hockey)\b/i.test(c) || /\b(maple leafs|bruins|penguins|canadiens|blackhawks|red wings|flyers|capitals|lightning|avalanche|oilers|canucks|senators|islanders|hurricanes|predators|blue jackets|sharks|ducks|coyotes|kraken|devils|sabres)\b/i.test(c)) return 'hockey';
  if (/\b(mlb|baseball|beisebol)\b/i.test(c) || /\b(yankees|red sox|dodgers|cubs|mets|astros|braves|phillies|padres|brewers|guardians|orioles|twins|rays|mariners|diamondbacks|rockies|pirates|royals|tigers|white sox|marlins)\b/i.test(c)) return 'baseball';
  if (/\b(rugby|sevens|svns|world rugby|super rugby)\b/i.test(c)) return 'rugby';
  if (/\b(futsal|lnf|cbfs|liga nacional de futsal)\b/i.test(c)) return 'futsal';
  if (/\b(handebol|handball|ehf|balonmano)\b/i.test(c)) return 'handball';
  if (/\b(gin[aá]stica|gymnastics|art[ií]stica|r[ií]tmica|trampolim|fig)\b/i.test(c)) return 'gymnastics';
  if (/\b(atletismo|athletics|diamond league|world athletics|maratona|meia.maratona|marathon|revezamento|heptatlo|decatlo|arremesso de peso|salto (?:em )?(?:dist[aâ]ncia|triplo|com vara|em altura))\b/i.test(c) || /\b\d{2,4}\s?m\s?(?:rasos|com barreiras|livres)\b/i.test(c)) return 'athletics';
  if (/\b(e[- ]?sports|esports|cblol|lol|league of legends|cs2|cs:?go|counter[- ]strike|valorant|dota\s?2?|free fire|rainbow six|r6|rocket league|fifa\s?e?sports|overwatch)\b/i.test(c)) return 'esports';

  if (/\b(atp|wta|roland garros|wimbledon|us open|australian open)\b/i.test(c) || /t[eê]nis/i.test(c)) return 'tennis';
  if (/\b(f[oó]rmula[ -]?[1e]|f1|grande pr[eê]mio|automobilismo|motogp|moto2|moto3|indycar|indy nxt|stock car|e-prix|superbike|porsche|carrera cup|nascar|copa truck|truck series|motocross|mxgp)\b/i.test(c) || /\bgp\b/i.test(c)) return 'f1';
  if (/\b(ufc|bellator|pfl|mma)\b/i.test(c)) return 'mma';
  if (/\b(box[e]?|wbc|wba|wbo|ibf)\b/i.test(c)) return 'boxing';
  if (/\b(superliga|beach pro tour|elite16)\b/i.test(c) || /v[oô]lei/i.test(c) || /liga das na[çc][oõ]es.*v[oô]lei/i.test(c)) return 'volleyball';
  if (/\b(wsl|surf|pipeline|tahiti pro)\b/i.test(c)) return 'surf';
  if (/\b(tour de france|giro|vuelta|ciclismo|cycling|paris.roubaix|uci)\b/i.test(c)) return 'cycling';
  if (/\b(nata[çc][aã]o|swimming|fina|world aquatics)\b/i.test(c)) return 'swimming';
  if (/\b(golf|golfe|pga|masters|augusta|ryder cup|the open|lpga)\b/i.test(c)) return 'golf';
  return 'football';
}

/**
 * Returns today's date as YYYY-MM-DD in America/Sao_Paulo timezone.
 * Falls back to browser local timezone if Intl is unavailable.
 */
export function getLocalDateString(date?: Date): string {
  const d = date ?? new Date();
  try {
    // Format in São Paulo timezone
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d); // returns YYYY-MM-DD in en-CA locale
    return parts;
  } catch {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

/**
 * Returns tomorrow's date as YYYY-MM-DD in America/Sao_Paulo timezone.
 */
export function getTomorrowDateString(): string {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return getLocalDateString(tomorrow);
}

/**
 * Returns an absolute Date for a game given its date (YYYY-MM-DD) and time (HH:MM)
 * in the America/Sao_Paulo timezone (UTC-3).
 */
function getGameTimestamp(gameDate: string, gameTime: string): Date {
  const [h, m] = (gameTime || "00:00").split(":").map(Number);
  return new Date(
    `${gameDate}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00-03:00`
  );
}

/**
 * Checks if a game is currently live based on its scheduled time and sport duration.
 */
export function isGameCurrentlyLive(gameTime: string, gameDate: string, sportType: SportType = 'football'): boolean {
  const now = new Date();
  const start = getGameTimestamp(gameDate, gameTime);
  const duration = (SPORT_DURATION[sportType] || 115) + LIVE_BUFFER_MINUTES;
  const end = new Date(start.getTime() + duration * 60_000);

  return now >= start && now < end;
}

/**
 * Returns elapsed minutes since game start, or null if game hasn't started
 * or duration has passed.
 */
export function getElapsedMinutes(gameTime: string, gameDate: string, sportType: SportType = 'football'): number | null {
  const now = new Date();
  const start = getGameTimestamp(gameDate, gameTime);
  const duration = (SPORT_DURATION[sportType] || 115) + LIVE_BUFFER_MINUTES;

  const elapsedMs = now.getTime() - start.getTime();
  if (elapsedMs < 0) return null;
  const elapsed = Math.floor(elapsedMs / 60_000);
  if (elapsed >= duration) return null;
  return elapsed;
}

/**
 * Returns minutes until a game starts, or null if game already started or passed.
 */
export function getMinutesUntilStart(gameTime: string, gameDate: string): number | null {
  const now = new Date();
  const start = getGameTimestamp(gameDate, gameTime);

  const diffMs = start.getTime() - now.getTime();
  if (diffMs <= 0) return null;
  return Math.ceil(diffMs / 60_000);
}

/**
 * Formats minutes into a human-readable countdown string (pt-BR).
 */
/**
 * Returns a Date object representing midnight of the given date in São Paulo (UTC-3).
 */
export function midnightInSaoPaulo(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00-03:00`);
}

export function formatCountdown(minutes: number): string {
  if (minutes < 1) return "Agora!";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
