import type { SportType } from "@/lib/gameUtils";

/** Centralized visual theme per sport.
 *  Uses HSL CSS variables defined in index.css (--sport-*).
 *  Values are emitted as inline style strings (not Tailwind classes). */
export interface SportTheme {
  /** Bright HSL color string `hsl(var(--sport-x))` */
  color: string;
  /** Translucent bg for soft fills */
  softBg: string;
  /** Border color (translucent) */
  border: string;
  /** Top header strip gradient */
  stripGradient: string;
  /** Glow shadow for live state */
  glow: string;
  /** Short uppercase label */
  label: string;
}

const make = (cssVar: string, label: string): SportTheme => ({
  color: `hsl(var(${cssVar}))`,
  softBg: `hsl(var(${cssVar}) / 0.12)`,
  border: `hsl(var(${cssVar}) / 0.35)`,
  stripGradient: `linear-gradient(90deg, hsl(var(${cssVar}) / 0.85) 0%, hsl(var(${cssVar}) / 0.45) 60%, hsl(var(${cssVar}) / 0) 100%)`,
  glow: `0 0 24px -6px hsl(var(${cssVar}) / 0.55)`,
  label,
});

export const SPORT_THEME: Record<SportType, SportTheme> = {
  football: make("--sport-football", "Futebol"),
  basketball: make("--sport-basketball", "Basquete"),
  volleyball: make("--sport-volleyball", "Vôlei"),
  tennis: make("--sport-tennis", "Tênis"),
  f1: make("--sport-f1", "F1"),
  mma: make("--sport-mma", "MMA"),
  hockey: make("--sport-hockey", "Hóquei"),
  baseball: make("--sport-baseball", "Baseball"),
  rugby: make("--sport-rugby", "Rugby"),
  surf: make("--sport-surf", "Surf"),
  cycling: make("--sport-cycling", "Ciclismo"),
  boxing: make("--sport-boxing", "Boxe"),
  swimming: make("--sport-swimming", "Natação"),
  golf: make("--sport-golf", "Golfe"),
  futsal: make("--sport-futsal", "Futsal"),
  handball: make("--sport-handball", "Handebol"),
  athletics: make("--sport-athletics", "Atletismo"),
  gymnastics: make("--sport-gymnastics", "Ginástica"),
  esports: make("--sport-esports", "eSports"),

};

export const getSportTheme = (sport: SportType): SportTheme =>
  SPORT_THEME[sport] ?? SPORT_THEME.football;

const HIGHLIGHT_COMPS = [
  "champions league", "brasileirão", "brasileirao", "campeonato brasileiro",
  "libertadores", "copa do brasil", "premier league", "campeonato inglês",
  "nba", "nba finals", "ufc", "world cup", "copa do mundo",
];

export function isHighlightCompetition(comp: string): boolean {
  const key = comp.toLowerCase().trim();
  return HIGHLIGHT_COMPS.some((c) => key.includes(c));
}
