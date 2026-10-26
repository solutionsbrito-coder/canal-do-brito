import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const REALTIME_DEBOUNCE_MS = 1_500;

/**
 * Subscribes to realtime changes on `daily_games` and refreshes the
 * schedule once per burst of changes (a publication can touch dozens of
 * rows at once). Archived-history queries are left alone because they are
 * not affected by live schedule edits.
 */
export const useRealtimeDailyGames = () => {
  const qc = useQueryClient();

  useEffect(() => {
    let timer: number | undefined;
    const flush = () => {
      timer = undefined;
      qc.invalidateQueries({
        queryKey: ["daily_games"],
        predicate: (query) => query.queryKey[1] !== "archived",
      });
    };

    const channel = supabase
      .channel("daily_games_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_games" },
        () => {
          if (timer !== undefined) window.clearTimeout(timer);
          timer = window.setTimeout(flush, REALTIME_DEBOUNCE_MS);
        }
      )
      .subscribe();

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [qc]);
};
