import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to realtime changes on `featured_movies` and invalidates
 * the cached query so all admins see updates instantly.
 */
export const useRealtimeMovies = () => {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("featured_movies_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "featured_movies" },
        () => {
          qc.invalidateQueries({ queryKey: ["featured_movies"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
};
