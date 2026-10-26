import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BannerCategory =
  | "cover" | "football" | "basketball" | "ufc" | "other_sports" | "football_guide"
  | "athletics" | "motorsport" | "tennis" | "volleyball" | "futsal" | "boxing"
  | "mma" | "hockey" | "baseball" | "rugby" | "surf" | "cycling" | "swimming"
  | "golf" | "handball" | "esports";

export interface Banner {
  id: string;
  image_url: string;
  title: string | null;
  category: BannerCategory;
  active: boolean;
  sort_order: number;
  expires_at: string | null;
  publish_at: string | null;
  created_at: string;
}

export const CATEGORY_LABELS: Record<BannerCategory, string> = {
  cover: "📺 Capa",
  football: "⚽ Futebol",
  futsal: "🥅 Futsal",
  basketball: "🏀 Basquete",
  volleyball: "🏐 Vôlei",
  handball: "🤾 Handebol",
  tennis: "🎾 Tênis",
  motorsport: "🏎️ Automobilismo",
  ufc: "🥊 UFC/MMA",
  mma: "🥋 MMA",
  boxing: "🥊 Boxe",
  athletics: "🏃 Atletismo",
  swimming: "🏊 Natação",
  cycling: "🚴 Ciclismo",
  surf: "🏄 Surf",
  golf: "⛳ Golfe",
  hockey: "🏒 Hóquei",
  baseball: "⚾ Baseball",
  rugby: "🏉 Rugby",
  esports: "🎮 eSports",
  other_sports: "🏆 Demais Esportes",
  football_guide: "📋 Guia do Futebol",
};

export const CATEGORY_LIST: BannerCategory[] = [
  "cover", "football", "futsal", "basketball", "volleyball", "handball", "tennis",
  "motorsport", "ufc", "mma", "boxing", "athletics", "swimming", "cycling", "surf",
  "golf", "hockey", "baseball", "rugby", "esports", "other_sports", "football_guide",
];

/** Maps a detected sport_type to the matching banner category */
export const SPORT_TO_CATEGORY: Record<string, BannerCategory> = {
  football: "football",
  futsal: "futsal",
  basketball: "basketball",
  volleyball: "volleyball",
  handball: "handball",
  tennis: "tennis",
  f1: "motorsport",
  mma: "ufc",
  boxing: "boxing",
  athletics: "athletics",
  swimming: "swimming",
  cycling: "cycling",
  surf: "surf",
  golf: "golf",
  hockey: "hockey",
  baseball: "baseball",
  rugby: "rugby",
  esports: "esports",
};


/** Single query fetching all active banners, grouped client-side */
export const useActiveBanners = () =>
  useQuery({
    queryKey: ["banners", "active-all"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("active", true)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const grouped = Object.fromEntries(
        CATEGORY_LIST.map((c) => [c, [] as Banner[]]),
      ) as Record<BannerCategory, Banner[]>;

      for (const b of (data as Banner[])) {
        // Defense-in-depth: hide rows whose publish_at is still in the future
        if (b.publish_at && new Date(b.publish_at).getTime() > Date.now()) continue;
        if (grouped[b.category]) grouped[b.category].push(b);
      }
      return grouped;
    },
    staleTime: 30_000,
  });

export const useBannersByCategory = (category: BannerCategory) =>
  useQuery({
    queryKey: ["banners", category],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("category", category)
        .eq("active", true)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as Banner[]).filter(
        (b) => !b.publish_at || new Date(b.publish_at).getTime() <= Date.now(),
      );
    },
    staleTime: 30_000,
  });

export const useAllBanners = (category?: BannerCategory) =>
  useQuery({
    queryKey: ["banners", "admin", category],
    queryFn: async () => {
      let q = supabase.from("banners").select("*").order("sort_order", { ascending: true });
      if (category) q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return data as Banner[];
    },
    staleTime: 30_000,
  });

export const useCreateBanner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (banner: { image_url: string; title?: string; category: BannerCategory; sort_order?: number; publish_at?: string; active?: boolean }) => {
      const { error } = await supabase.from("banners").insert(banner as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["banners"] }),
  });
};

export const useUpdateBanner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Banner> & { id: string }) => {
      const { error } = await supabase.from("banners").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["banners"] }),
  });
};

export const useDeleteBanner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["banners"] }),
  });
};
