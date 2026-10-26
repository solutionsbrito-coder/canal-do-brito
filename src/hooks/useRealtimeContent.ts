import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to realtime changes on a table and invalidates the matching
 * react-query cache key, so every admin sees updates instantly.
 */
export const useRealtimeTable = (table: string, queryKey: string) => {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`${table}_changes`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        qc.invalidateQueries({ queryKey: [queryKey] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, table, queryKey]);
};

export const useRealtimeSeries = () => useRealtimeTable("featured_series", "featured_series");
export const useRealtimeNewsReleases = () => useRealtimeTable("news_releases", "news_releases");
