import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeaturedMovie {
  id: string;
  tmdb_id: number;
  title: string;
  poster_url: string | null;
  backdrop_url: string | null;
  overview: string | null;
  rating: number | null;
  year: number | null;
  genre: string | null;
  active: boolean;
  created_at: string;
  sort_order: number;
}

export const useActiveMovies = () =>
  useQuery({
    queryKey: ["featured_movies", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("featured_movies")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FeaturedMovie[];
    },
  });

export const useAllMovies = () =>
  useQuery({
    queryKey: ["featured_movies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("featured_movies")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FeaturedMovie[];
    },
  });

export const useAddMovie = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (movie: Omit<FeaturedMovie, "id" | "active" | "created_at" | "sort_order"> & { added_by?: string | null }) => {
      // Place new movies at the top (lowest sort_order - 1)
      const { data: minRow } = await supabase
        .from("featured_movies")
        .select("sort_order")
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      const nextOrder = (minRow?.sort_order ?? 0) - 1;
      const { error } = await supabase.from("featured_movies").insert({ ...movie, sort_order: nextOrder });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["featured_movies"] }),
  });
};

export const useToggleMovie = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("featured_movies").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["featured_movies"] }),
  });
};

export const useUpdateMovie = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; genre?: string | null; rating?: number | null; overview?: string | null; poster_url?: string | null; backdrop_url?: string | null }) => {
      const { error } = await supabase.from("featured_movies").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["featured_movies"] }),
  });
};

export const useDeleteMovie = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("featured_movies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["featured_movies"] }),
  });
};

export const useReorderMovies = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Update each row with its new sort_order index
      const updates = orderedIds.map((id, index) =>
        supabase.from("featured_movies").update({ sort_order: index }).eq("id", id)
      );
      const results = await Promise.all(updates);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
    },
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: ["featured_movies"] });
      const prev = qc.getQueryData<FeaturedMovie[]>(["featured_movies"]);
      if (prev) {
        const map = new Map(prev.map((m) => [m.id, m]));
        const next = orderedIds.map((id, i) => ({ ...(map.get(id) as FeaturedMovie), sort_order: i }));
        qc.setQueryData(["featured_movies"], next);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["featured_movies"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["featured_movies"] }),
  });
};
