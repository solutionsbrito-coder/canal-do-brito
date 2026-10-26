import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Counts `landing_with_utm` events grouped by `utm_content` over the given window.
 * Used by the WhatsApp admin to show per-link access counts.
 */
export function useShareLandingCounts(contents: string[], windowDays: number = 7, refreshKey: number = 0) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  // Stable key to avoid re-fetching when array identity changes but values don't
  const key = contents.slice().sort().join("|");

  useEffect(() => {
    if (contents.length === 0) { setCounts({}); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const since = new Date(Date.now() - windowDays * 24 * 3600 * 1000).toISOString();
        const client = supabase.from("analytics_events") as unknown as {
          select: (cols: string) => {
            eq: (k: string, v: string) => {
              in: (k: string, v: string[]) => {
                gte: (k: string, v: string) => {
                  limit: (n: number) => Promise<{ data: Array<{ utm_content: string | null }> | null; error: unknown }>;
                };
              };
            };
          };
        };
        const { data, error } = await client
          .select("utm_content")
          .eq("event", "landing_with_utm")
          .in("utm_content", contents)
          .gte("created_at", since)
          .limit(2000);
        if (error) throw error;
        const out: Record<string, number> = {};
        for (const row of data ?? []) {
          if (!row.utm_content) continue;
          out[row.utm_content] = (out[row.utm_content] ?? 0) + 1;
        }
        if (!cancelled) setCounts(out);
      } catch (e) {
        if (import.meta.env.DEV) console.debug("[useShareLandingCounts] failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
     
  }, [key, windowDays, refreshKey]);

  return { counts, loading };
}
