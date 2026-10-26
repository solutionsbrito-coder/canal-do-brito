import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NewsRelease {
  id: string;
  title: string;
  content_type: string;
  badge_type: string;
  image_url: string | null;
  overview: string | null;
  year: number | null;
  rating: number | null;
  tmdb_id: number | null;
  active: boolean;
  display_order: number;
  added_by: string | null;
  created_at: string;
  genres: string | null;
  runtime: number | null;
  seasons: number | null;
  tagline: string | null;
  backdrop_url: string | null;
}

export const useActiveNewsReleases = () =>
  useQuery({
    queryKey: ["news_releases", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_releases")
        .select("*")
        .eq("active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as NewsRelease[];
    },
  });

export const useAllNewsReleases = () =>
  useQuery({
    queryKey: ["news_releases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_releases")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as NewsRelease[];
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5 * 60_000,
  });

export const useAddNewsRelease = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Omit<NewsRelease, "id" | "active" | "created_at">) => {
      const { error } = await supabase.from("news_releases").insert(item);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["news_releases"] }),
  });
};

export const useUpdateNewsRelease = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string } & Partial<Pick<NewsRelease, "active" | "badge_type" | "display_order" | "title" | "overview" | "genres" | "runtime" | "seasons" | "tagline" | "rating" | "image_url" | "backdrop_url">>) => {
      const { error } = await supabase.from("news_releases").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["news_releases"] }),
  });
};

export const useToggleNewsRelease = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("news_releases").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["news_releases"] }),
  });
};

export const useDeleteNewsRelease = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("news_releases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["news_releases"] }),
  });
};

export const useReorderNewsReleases = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from("news_releases").update({ display_order: index }).eq("id", id)
      );
      const results = await Promise.all(updates);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
    },
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: ["news_releases"] });
      const prev = qc.getQueryData<NewsRelease[]>(["news_releases"]);
      if (prev) {
        const map = new Map(prev.map((i) => [i.id, i]));
        const next = orderedIds.map((id, i) => ({ ...(map.get(id) as NewsRelease), display_order: i }));
        qc.setQueryData(["news_releases"], next);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["news_releases"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["news_releases"] }),
  });
};
