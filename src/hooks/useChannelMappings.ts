import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeChannelName, type LogoKey } from "@/components/public/channelLogos";

export type ChannelMapping = {
  id: string;
  name: string;
  name_normalized: string;
  logo_key: LogoKey;
  short: string | null;
  active: boolean;
  custom_logo_url?: string | null;
  light_chip?: boolean;
  sort_order?: number;
  updated_at?: string | null;
  channel_type?: string | null;
  primary_color?: string | null;
};

export type ChannelAlias = {
  id: string;
  mapping_id: string;
  alias: string;
  alias_normalized: string;
};

export const CHANNEL_MAPPINGS_QK = ["channel_logo_mappings"] as const;
export const CHANNEL_ALIASES_QK = ["channel_aliases"] as const;

export function useChannelMappings() {
  return useQuery({
    queryKey: CHANNEL_MAPPINGS_QK,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Map<string, ChannelMapping>> => {
      const [{ data: rows, error }, { data: aliases, error: aliasErr }] = await Promise.all([
        supabase.from("channel_logo_mappings").select("*").eq("active", true),
        supabase.from("channel_aliases").select("*"),
      ]);
      if (error) throw error;
      if (aliasErr) throw aliasErr;

      const map = new Map<string, ChannelMapping>();
      const byId = new Map<string, ChannelMapping>();
      for (const row of (rows ?? []) as ChannelMapping[]) {
        const k = row.name_normalized || normalizeChannelName(row.name);
        map.set(k, row);
        byId.set(row.id, row);
      }
      for (const a of (aliases ?? []) as ChannelAlias[]) {
        const m = byId.get(a.mapping_id);
        if (!m) continue;
        const k = a.alias_normalized || normalizeChannelName(a.alias);
        if (!map.has(k)) map.set(k, m);
      }
      return map;
    },
  });
}

export function useChannelAliases(mappingId: string | undefined) {
  return useQuery({
    queryKey: [...CHANNEL_ALIASES_QK, mappingId],
    enabled: !!mappingId,
    queryFn: async (): Promise<ChannelAlias[]> => {
      const { data, error } = await supabase
        .from("channel_aliases")
        .select("*")
        .eq("mapping_id", mappingId!)
        .order("alias", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChannelAlias[];
    },
  });
}
