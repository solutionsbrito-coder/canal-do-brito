import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared cache: tmdb_id → YouTube trailer key (or null if none).
 * Same cache instance used by useTrailerKey for zero-duplication.
 */
const STORAGE_KEY = "canal-do-brito:trailers:v1";
const cache = new Map<number, string | null>();

try {
  const saved = sessionStorage.getItem(STORAGE_KEY);
  if (saved) {
    for (const [id, key] of JSON.parse(saved) as Array<[number, string | null]>) cache.set(id, key);
  }
} catch {
  // Storage can be unavailable in private browsing; memory cache still works.
}

export function cacheTrailer(id: number, key: string | null) {
  cache.set(id, key);
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...cache.entries()]));
  } catch {
    // A full or unavailable storage must not block trailer playback.
  }
}

/** Expose cache for useTrailerKey to share */
export { cache as trailerCache };

const findYouTubeTrailer = (results: any[]) =>
  results.find((v: any) => v.type === "Trailer" && v.site === "YouTube") ||
  results.find((v: any) => v.site === "YouTube");

interface TrailerAvailability {
  /** Map of tmdb_id → true/false (has trailer or not) */
  available: Map<number, boolean>;
  loading: boolean;
}

/**
 * Pre-fetches trailer availability for a list of items.
 * Batches requests with staggered timing to avoid flooding the edge function.
 * Returns a Map<tmdb_id, boolean> indicating which items have trailers.
 */
export const useTrailerAvailability = (
  items: Array<{ tmdb_id?: number | null; content_type?: string }> | undefined
): TrailerAvailability => {
  const [available, setAvailable] = useState<Map<number, boolean>>(new Map());
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!items?.length) return;

    abortRef.current = false;

    // Collect unique tmdb_ids that aren't cached yet
    const uncached: Array<{ tmdb_id: number; isTv: boolean }> = [];
    const initialMap = new Map<number, boolean>();

    for (const item of items) {
      if (!item.tmdb_id) continue;
      if (cache.has(item.tmdb_id)) {
        initialMap.set(item.tmdb_id, cache.get(item.tmdb_id) !== null);
      } else {
        const isTv = item.content_type === "series" || item.content_type === "tv";
        uncached.push({ tmdb_id: item.tmdb_id, isTv });
      }
    }

    if (initialMap.size > 0) {
      setAvailable(new Map(initialMap));
    }

    if (uncached.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchAll = async () => {
      const result = new Map(initialMap);

      // Process in small batches of 3 to avoid rate limits
      const BATCH_SIZE = 3;
      for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
        if (abortRef.current) return;

        const batch = uncached.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async ({ tmdb_id, isTv }) => {
          try {
            // Try Portuguese first
            const actionPt = isTv ? "tv_videos" : "movie_videos";
            const { data } = await supabase.functions.invoke("tmdb-proxy", {
              body: { action: actionPt, query: String(tmdb_id) },
            });

            if (data?.results) {
              const t = findYouTubeTrailer(data.results);
              if (t) {
                cacheTrailer(tmdb_id, t.key);
                return { tmdb_id, hasTrailer: true };
              }
            }

            // Fallback to English
            const actionEn = isTv ? "tv_videos_en" : "movie_videos_en";
            const { data: dataEn } = await supabase.functions.invoke("tmdb-proxy", {
              body: { action: actionEn, query: String(tmdb_id) },
            });

            if (dataEn?.results) {
              const t = findYouTubeTrailer(dataEn.results);
              if (t) {
                cacheTrailer(tmdb_id, t.key);
                return { tmdb_id, hasTrailer: true };
              }
            }

            cacheTrailer(tmdb_id, null);
            return { tmdb_id, hasTrailer: false };
          } catch {
            cacheTrailer(tmdb_id, null);
            return { tmdb_id, hasTrailer: false };
          }
        });

        const results = await Promise.all(promises);
        if (abortRef.current) return;

        for (const r of results) {
          result.set(r.tmdb_id, r.hasTrailer);
        }

        setAvailable(new Map(result));
      }

      if (!abortRef.current) setLoading(false);
    };

    fetchAll();

    return () => {
      abortRef.current = true;
    };
  }, [items]);

  return { available, loading };
};
