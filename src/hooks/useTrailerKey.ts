import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trailerCache as cache, cacheTrailer } from "./useTrailerAvailability";

const findYouTubeTrailer = (results: any[]) =>
  results.find((v: any) => v.type === "Trailer" && v.site === "YouTube") ||
  results.find((v: any) => v.site === "YouTube");

export const useTrailerKey = (
  tmdb_id: number | null | undefined,
  content_type: string | undefined,
  enabled = true
) => {
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !tmdb_id) {
      setTrailerKey(null);
      setLoading(false);
      return;
    }

    if (cache.has(tmdb_id)) {
      setTrailerKey(cache.get(tmdb_id)!);
      return;
    }

    let cancelled = false;
    const isTv = content_type === "series" || content_type === "tv";

    const fetchTrailer = async () => {
      setLoading(true);
      setTrailerKey(null);

      try {
        const actionPt = isTv ? "tv_videos" : "movie_videos";
        const { data } = await supabase.functions.invoke("tmdb-proxy", {
          body: { action: actionPt, query: String(tmdb_id) },
        });
        if (cancelled) return;

        if (data?.results) {
          const t = findYouTubeTrailer(data.results);
          if (t) {
            cacheTrailer(tmdb_id, t.key);
            setTrailerKey(t.key);
            return;
          }
        }

        const actionEn = isTv ? "tv_videos_en" : "movie_videos_en";
        const { data: dataEn } = await supabase.functions.invoke("tmdb-proxy", {
          body: { action: actionEn, query: String(tmdb_id) },
        });
        if (cancelled) return;

        if (dataEn?.results) {
          const t = findYouTubeTrailer(dataEn.results);
          if (t) {
            cacheTrailer(tmdb_id, t.key);
            setTrailerKey(t.key);
            return;
          }
        }

        cacheTrailer(tmdb_id, null);
      } catch (e) {
        console.error("Trailer fetch error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrailer();
    return () => { cancelled = true; };
  }, [tmdb_id, content_type, enabled]);

  return { trailerKey, loading };
};
