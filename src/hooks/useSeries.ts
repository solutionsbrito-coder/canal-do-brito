import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeaturedSeries {
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

export const useActiveSeries = () =>
  useQuery({
    queryKey: ["featured_series", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("featured_series")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FeaturedSeries[];
    },
  });

export const useAllSeries = () =>
  useQuery({
    queryKey: ["featured_series"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("featured_series")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FeaturedSeries[];
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5 * 60_000,
  });

export const useAddSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (series: Omit<FeaturedSeries, "id" | "active" | "created_at" | "sort_order"> & { added_by?: string | null }) => {
      // Novas séries entram no topo (menor sort_order - 1), igual a Filmes
      const { data: minRow } = await supabase
        .from("featured_series")
        .select("sort_order")
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      const nextOrder = (minRow?.sort_order ?? 0) - 1;
      const { error } = await supabase.from("featured_series").insert({ ...series, sort_order: nextOrder });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["featured_series"] }),
  });
};

export const useToggleSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("featured_series").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["featured_series"] }),
  });
};

export const useUpdateSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; genre?: string | null; rating?: number | null; overview?: string | null; poster_url?: string | null; backdrop_url?: string | null }) => {
      const { error } = await supabase.from("featured_series").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["featured_series"] }),
  });
};

export const useDeleteSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("featured_series").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["featured_series"] }),
  });
};

export const useReorderSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from("featured_series").update({ sort_order: index }).eq("id", id)
      );
      const results = await Promise.all(updates);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
    },
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: ["featured_series"] });
      const prev = qc.getQueryData<FeaturedSeries[]>(["featured_series"]);
      if (prev) {
        const map = new Map(prev.map((s) => [s.id, s]));
        const next = orderedIds.map((id, i) => ({ ...(map.get(id) as FeaturedSeries), sort_order: i }));
        qc.setQueryData(["featured_series"], next);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["featured_series"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["featured_series"] }),
  });
};
