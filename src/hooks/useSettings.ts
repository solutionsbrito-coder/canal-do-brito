import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSettings = () =>
  useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*");
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((s: { key: string; value: string }) => {
        map[s.key] = s.value;
      });
      return map;
    },
  });

import { isSecretSettingKey } from "@/lib/settingsSecret";

export const useUpdateSetting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data: existing } = await supabase
        .from("settings")
        .select("id")
        .eq("key", key)
        .maybeSingle();

      if (existing) {
        // A seed antiga já criou tmdb_api_key com is_secret=false; o
        // trigger também valida UPDATE, então o update precisa corrigir
        // o flag junto com o valor, senão o erro persiste mesmo com o
        // insert corrigido.
        const { error } = await supabase
          .from("settings")
          .update({ value, is_secret: isSecretSettingKey(key) })
          .eq("key", key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("settings")
          .insert({ key, value, is_secret: isSecretSettingKey(key) });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
};
