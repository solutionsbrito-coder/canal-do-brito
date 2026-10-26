/**
 * Normalized key for deduplication of daily games.
 * Matches the Postgres unique index `daily_games_unique_event`:
 *   (date, lower(btrim(home_team)), lower(btrim(coalesce(away_team, ''))), game_time, sport_type)
 *
 * Aggressive normalization to catch invisible variants:
 *  - NFKC: collapses different unicode forms of the same character
 *  - NBSP (\u00A0) → space
 *  - multiple whitespace → single space
 *  - trim + lowercase
 */
function norm(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFKC")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function gameKey(g: {
  home_team: string;
  away_team: string;
  game_time: string;
  sport_type?: string | null;
}): string {
  return [
    norm(g.home_team),
    norm(g.away_team),
    (g.game_time ?? "").slice(0, 5),
    norm(g.sport_type ?? ""),
  ].join("|");
}
