import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { gameKey } from "@/lib/dedup";
import { toast } from "sonner";

export interface DailyGame {
  id: string;
  date: string;
  home_team: string;
  away_team: string;
  competition: string;
  competition_detail: string | null;
  game_time: string;
  channels: string[];
  is_live: boolean;
  is_womens: boolean;
  active: boolean;
  archived: boolean;
  status_short: string;
  elapsed_minutes: number | null;
  publish_at: string | null;
  sport_type: string;
  created_at: string;
  external_id?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  live_status?: string | null;
  live_updated_at?: string | null;
  source?: string | null;
  external_source?: string | null;
  external_sport?: string | null;
  live_clock?: string | null;
  period?: string | null;
}

const PUBLIC_GAME_COLUMNS = "id,date,home_team,away_team,competition,competition_detail,game_time,channels,is_live,is_womens,active,archived,status_short,elapsed_minutes,publish_at,sport_type,created_at,external_id,home_score,away_score,live_status,live_updated_at,source";

const PUBLIC_SCHEDULE_CACHE_KEY = "agenda:public-games:v1";
const PUBLIC_SCHEDULE_TIMEOUT_MS = 8_000;

type PublicScheduleCache = {
  savedAt: number;
  dates: string[];
  games: DailyGame[];
};

function readPublicScheduleCache(dates: string[]): DailyGame[] | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const parsed = JSON.parse(localStorage.getItem(PUBLIC_SCHEDULE_CACHE_KEY) ?? "null") as PublicScheduleCache | null;
    if (!parsed || !Array.isArray(parsed.games) || !Array.isArray(parsed.dates)) return undefined;
    if (Date.now() - parsed.savedAt > 24 * 60 * 60_000) return undefined;
    if (!dates.every((date) => parsed.dates.includes(date))) return undefined;
    return parsed.games.filter((game) => dates.includes(game.date));
  } catch {
    return undefined;
  }
}

function writePublicScheduleCache(dates: string[], games: DailyGame[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PUBLIC_SCHEDULE_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), dates, games }));
  } catch {
    // Storage can be unavailable in private mode; the live request still works.
  }
}

export const useDailyGames = (date: string) => {
  return useQuery({
    queryKey: ["daily_games", date, "public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_games")
        .select(PUBLIC_GAME_COLUMNS)
        .eq("date", date)
        .eq("active", true)
        .eq("archived", false)
        .eq("source", "manual")
        .order("game_time", { ascending: true });
      if (error) throw error;
      return data as DailyGame[];
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

export const useAllDailyGames = (date: string) => {
  return useQuery({
    queryKey: ["daily_games", "all", date, "public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_games")
        .select(PUBLIC_GAME_COLUMNS)
        .eq("date", date)
        .eq("source", "manual")
        .order("game_time", { ascending: true });
      if (error) throw error;

      return data as DailyGame[];
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5 * 60_000,
  });
};

export const useAllDailyGamesRange = (dates: string[]) => {
  const stableDates = [...dates].sort();
  return useQuery({
    queryKey: ["daily_games", "all-range", stableDates],
    queryFn: async ({ signal }) => {
      const timeoutController = new AbortController();
      const timeoutId = window.setTimeout(() => timeoutController.abort(), PUBLIC_SCHEDULE_TIMEOUT_MS);
      const abort = () => timeoutController.abort();
      signal.addEventListener("abort", abort, { once: true });
      try {
        const { data, error } = await supabase
          .from("daily_games")
          .select(PUBLIC_GAME_COLUMNS)
          .in("date", stableDates)
          .eq("source", "manual")
          .order("date", { ascending: true })
          .order("game_time", { ascending: true })
          .abortSignal(timeoutController.signal);
        if (error) throw error;
        const games = data as DailyGame[];
        writePublicScheduleCache(stableDates, games);
        return games;
      } finally {
        window.clearTimeout(timeoutId);
        signal.removeEventListener("abort", abort);
      }
    },
    enabled: stableDates.length > 0,
    initialData: () => readPublicScheduleCache(stableDates),
    initialDataUpdatedAt: () => {
      if (typeof window === "undefined") return undefined;
      try {
        const parsed = JSON.parse(localStorage.getItem(PUBLIC_SCHEDULE_CACHE_KEY) ?? "null") as PublicScheduleCache | null;
        return parsed?.savedAt;
      } catch {
        return undefined;
      }
    },
    // Uma nova tentativa automática após 3s antes de mostrar "Tentar novamente".
    retry: 1,
    retryDelay: 3_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
};

/**
 * Insert daily games with automatic dedup:
 * fetches existing games for the date(s) and skips duplicates.
 */
/** Defensive sanitization: remove broken surrogates from any string */
function sanitizeGameStr(s: string): string {
  return s
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/[\u{1F3F4}\u{E0067}-\u{E007F}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const DAILY_GAMES_COLUMNS = new Set([
  "date", "home_team", "away_team", "competition", "competition_detail",
  "game_time", "channels", "is_live", "is_womens", "active", "archived",
  "status_short", "elapsed_minutes", "publish_at", "sport_type",
]);

/** Split a combined channel string ("Globo / SporTV, ESPN e TNT") into individual entries. */
export function normalizeChannelsList(input: unknown): string[] {
  if (input == null) return [];
  const arr = Array.isArray(input) ? input : [input];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of arr) {
    if (typeof raw !== "string") continue;
    const parts = raw
      .split(/[,/|;]+/)
      .flatMap((p) => p.split(/\s+(?:e|&|\+)\s+(?=[A-Za-z0-9])/i))
      .map((p) => sanitizeGameStr(p))
      .filter(Boolean);
    for (const p of parts) {
      const k = p.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(p);
    }
  }
  return out;
}

function sanitizeGame(game: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(game)) {
    if (!DAILY_GAMES_COLUMNS.has(key)) continue;
    if (typeof value === "string" && ["home_team","away_team","competition","competition_detail"].includes(key)) {
      out[key] = sanitizeGameStr(value);
    } else {
      out[key] = value;
    }
  }
  if ("channels" in out) {
    out.channels = normalizeChannelsList(out.channels);
  }
  return out;
}

export const useInsertDailyGames = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (games: Omit<DailyGame, "id" | "created_at">[]) => {
      if (games.length === 0) return { inserted: 0, skipped: 0, intraBatchSkipped: 0 };

      // STEP 1: dedup INSIDE the batch itself (keep first occurrence).
      // Without this, two identical rows in the same payload trigger PG 23505
      // and abort the whole INSERT — which is exactly what failed on 28/04.
      const seen = new Set<string>();
      const intraDeduped: typeof games = [];
      let intraBatchSkipped = 0;
      for (const g of games) {
        const k = gameKey(g) + "|" + g.date;
        if (seen.has(k)) {
          intraBatchSkipped++;
          continue;
        }
        seen.add(k);
        intraDeduped.push(g);
      }

      // STEP 2: dedup against existing rows in DB.
      const dates = [...new Set(intraDeduped.map((g) => g.date))];
      const { data: existing, error: fetchErr } = await supabase
        .from("daily_games")
        .select("home_team, away_team, game_time, date, sport_type")
        .in("date", dates)
        .eq("archived", false);
      if (fetchErr) throw fetchErr;

      const existingKeys = new Set(
        (existing || []).map((e: any) => gameKey(e) + "|" + e.date)
      );

      const unique = intraDeduped.filter((g) => !existingKeys.has(gameKey(g) + "|" + g.date));
      const dbSkipped = intraDeduped.length - unique.length;
      const skipped = dbSkipped + intraBatchSkipped;

      let insertedIds: string[] = [];
      if (unique.length > 0) {
        const sanitized = unique.map(sanitizeGame);
        const { data: insertedRows, error } = await supabase
          .from("daily_games")
          .insert(sanitized as any)
          .select("id");
        if (error) {
          // PG 23505 = unique_violation. Race condition or hidden duplicate.
          if ((error as any).code === "23505") {
            toast.warning(
              "Alguns jogos já existem com data, horário e times idênticos. Foram ignorados."
            );
            return { inserted: 0, skipped: skipped + unique.length, intraBatchSkipped };
          }
          throw error;
        }
        insertedIds = (insertedRows || []).map((r: any) => r.id);
      }

      if (intraBatchSkipped > 0) {
        toast.info(`${intraBatchSkipped} duplicata(s) interna(s) no texto colado ignorada(s)`);
      }
      if (dbSkipped > 0) {
        toast.info(`${dbSkipped} jogo(s) já existente(s) no banco ignorado(s)`);
      }

      return { inserted: unique.length, skipped, intraBatchSkipped };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily_games"] }),
  });
};

export const useUpdateDailyGame = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DailyGame> & { id: string }) => {
      const sanitized = sanitizeGame(updates as Record<string, any>);
      const { error } = await supabase.from("daily_games").update(sanitized as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily_games"] }),
  });
};

export const useDeleteDailyGame = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_games").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily_games"] }),
  });
};

export const useArchivedDailyGames = () =>
  useQuery({
    queryKey: ["daily_games", "archived"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_games")
        .select("*")
        .eq("archived", true)
        .order("date", { ascending: false })
        .order("game_time", { ascending: true });
      if (error) throw error;
      return data as DailyGame[];
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5 * 60_000,
  });

/** Resumo leve dos arquivados: quantidade por data (só a coluna date). */
export const useArchivedDatesSummary = () =>
  useQuery({
    queryKey: ["daily_games", "archived", "dates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_games")
        .select("date")
        .eq("archived", true)
        .order("date", { ascending: false })
        .limit(5000);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const r of data ?? []) counts.set(r.date, (counts.get(r.date) ?? 0) + 1);
      return [...counts.entries()].map(([date, count]) => ({ date, count }));
    },
    staleTime: 60_000,
  });

export const ARCHIVED_PAGE_SIZE = 30;

/** Página de arquivados com filtro por data e busca (servidor). */
export const useArchivedDailyGamesPage = (opts: { date: string | null; search: string; page: number }) =>
  useQuery({
    queryKey: ["daily_games", "archived", "page", opts.date, opts.search, opts.page],
    queryFn: async () => {
      const from = opts.page * ARCHIVED_PAGE_SIZE;
      let q = supabase
        .from("daily_games")
        .select("*", { count: "exact" })
        .eq("archived", true)
        .order("date", { ascending: false })
        .order("game_time", { ascending: true })
        .range(from, from + ARCHIVED_PAGE_SIZE - 1);
      if (opts.date) q = q.eq("date", opts.date);
      const s = opts.search.trim().replace(/[%,()]/g, " ");
      if (s) q = q.or(`home_team.ilike.%${s}%,away_team.ilike.%${s}%,competition.ilike.%${s}%`);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as DailyGame[], total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });

/** Restaura (desarquiva) todos os jogos de uma data. */
export const useRestoreArchivedDay = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (date: string) => {
      const { data, error } = await supabase
        .from("daily_games")
        .update({ archived: false, active: true })
        .eq("archived", true)
        .eq("date", date)
        .select("id");
      if (error) throw error;
      return data?.length ?? 0;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily_games"] }),
  });
};

export const useDeleteDailyGamesByDate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (date: string) => {
      const { error } = await supabase.from("daily_games").delete().eq("date", date);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily_games"] }),
  });
};

/**
 * Fetch existing game keys for a date (used by ProgramacaoTexto for visual dedup).
 */
export async function fetchExistingGameKeys(date: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("daily_games")
    .select("home_team, away_team, game_time, sport_type")
    .eq("date", date)
    .eq("archived", false);
  return new Set((data || []).map((g: any) => gameKey(g)));
}
