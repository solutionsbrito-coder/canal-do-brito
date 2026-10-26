import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeChannelName, isChannelFragment } from "@/components/public/channelLogos";
import { BUILTIN_CHANNEL_MAP } from "@/components/public/ChannelBadge";
import { useChannelMappings, type ChannelMapping } from "./useChannelMappings";

export type OrphanReason = "no-mapping" | "logo-none" | null;

export type DiscoveredChannel = {
  name: string;
  normalized: string;
  count: number;
  mapping?: ChannelMapping;
  isBuiltin: boolean;
  isOrphan: boolean;
  /** Por que está sem logo: sem mapeamento, ou mapeado com "sem logo". */
  orphanReason?: OrphanReason;
};

const BUILTIN_NORMALIZED = new Set(
  Object.keys(BUILTIN_CHANNEL_MAP).map(normalizeChannelName)
);

/** Janela padrão de descoberta (dias). */
export const DISCOVERY_WINDOW_DAYS = 90;

export function useDiscoveredChannels(windowDays: number = DISCOVERY_WINDOW_DAYS) {
  const { data: mappings } = useChannelMappings();

  const { data: rawChannels, isLoading, refetch } = useQuery({
    queryKey: ["discovered-channels", windowDays],
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - windowDays);
      const { data, error } = await supabase
        .from("daily_games")
        .select("channels")
        .gte("date", since.toISOString().slice(0, 10))
        .limit(5000);
      if (error) throw error;

      const counts = new Map<string, { name: string; count: number }>();
      for (const row of (data ?? []) as Array<{ channels: string[] | null }>) {
        for (const ch of row.channels ?? []) {
          if (!ch || typeof ch !== "string") continue;
          const trimmed = ch.trim();
          if (!trimmed) continue;
          // Fragmentos de parênteses ("MG)", "PR") não são canais.
          if (isChannelFragment(trimmed)) continue;
          const norm = normalizeChannelName(trimmed);
          if (!norm) continue;
          const existing = counts.get(norm);
          if (existing) existing.count += 1;
          else counts.set(norm, { name: trimmed, count: 1 });
        }
      }
      return counts;
    },
  });

  return useMemo(() => {
    const items: DiscoveredChannel[] = [];
    if (rawChannels) {
      for (const [normalized, { name, count }] of rawChannels.entries()) {
        const mapping = mappings?.get(normalized);
        const isBuiltin = BUILTIN_NORMALIZED.has(normalized);
        const hasCustom = !!mapping?.custom_logo_url;
        const mappedToNone = !!mapping && mapping.logo_key === "none" && !hasCustom;
        // Um mapeamento com logo_key "none" sobrescreve o built-in e deixa o
        // canal sem logo — por isso conta como órfão mesmo sendo built-in.
        const hasLogo =
          hasCustom || (!!mapping && mapping.logo_key !== "none") || (isBuiltin && !mappedToNone);
        const orphanReason: OrphanReason = hasLogo ? null : mappedToNone ? "logo-none" : "no-mapping";
        items.push({
          name,
          normalized,
          count,
          mapping,
          isBuiltin,
          isOrphan: !hasLogo,
          orphanReason,
        });
      }
    }
    items.sort((a, b) => b.count - a.count);
    const orphans = items.filter((i) => i.isOrphan);
    const coverage = items.length
      ? Math.round(((items.length - orphans.length) / items.length) * 100)
      : 100;
    return {
      isLoading,
      refetch,
      all: items,
      orphans,
      mapped: items.filter((i) => !!i.mapping),
      builtin: items.filter((i) => i.isBuiltin && !i.mapping),
      coverage,
      topOrphans: orphans.slice(0, 5),
    };
  }, [rawChannels, mappings, isLoading, refetch]);
}
