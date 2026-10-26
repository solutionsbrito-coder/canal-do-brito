import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WatchProgress {
  id: string;
  user_id: string;
  content_id: string;
  content_type: string;
  title: string;
  poster_url: string | null;
  backdrop_url: string | null;
  rating: number | null;
  year: number | null;
  genre: string | null;
  overview: string | null;
  progress_seconds: number;
  duration_seconds: number;
  is_finished: boolean;
  updated_at: string;
}

const WATCH_PROGRESS_QK = ["watch_progress"];
// Table is not in the generated types — cast to bypass the strict typings.
const wp = () => (supabase as any).from("watch_progress");

export const useWatchProgress = () =>
  useQuery({
    queryKey: WATCH_PROGRESS_QK,
    queryFn: async () => {
      const { data, error } = await wp()
        .select("*")
        .eq("is_finished", false)
        .order("updated_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as WatchProgress[];
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30 * 60_000,
  });

export const useUpsertProgress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: {
      content_id: string;
      content_type: string;
      title: string;
      poster_url?: string | null;
      backdrop_url?: string | null;
      rating?: number | null;
      year?: number | null;
      genre?: string | null;
      overview?: string | null;
      progress_seconds?: number;
      duration_seconds?: number;
      is_finished?: boolean;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Usuário não autenticado");

      const { error } = await wp().upsert(
        {
          user_id: user.user.id,
          content_id: item.content_id,
          content_type: item.content_type,
          title: item.title,
          poster_url: item.poster_url ?? null,
          backdrop_url: item.backdrop_url ?? null,
          rating: item.rating ?? null,
          year: item.year ?? null,
          genre: item.genre ?? null,
          overview: item.overview ?? null,
          progress_seconds: item.progress_seconds ?? 0,
          duration_seconds: item.duration_seconds ?? 3600,
          is_finished: item.is_finished ?? false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id, content_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WATCH_PROGRESS_QK });
    },
  });
};

export const useDeleteProgress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await wp().delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WATCH_PROGRESS_QK });
    },
  });
};
