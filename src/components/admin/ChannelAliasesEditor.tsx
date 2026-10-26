import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  CHANNEL_ALIASES_QK,
  CHANNEL_MAPPINGS_QK,
  useChannelAliases,
} from "@/hooks/useChannelMappings";
import { normalizeChannelName } from "@/components/public/channelLogos";

interface Props {
  mappingId: string;
}

export function ChannelAliasesEditor({ mappingId }: Props) {
  const qc = useQueryClient();
  const { data: aliases, isLoading } = useChannelAliases(mappingId);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: CHANNEL_ALIASES_QK });
    qc.invalidateQueries({ queryKey: CHANNEL_MAPPINGS_QK });
  };

  const add = async () => {
    const trimmed = draft.trim();
    const normalized = normalizeChannelName(trimmed);
    if (!trimmed || !normalized) return;

    setSaving(true);
    try {
      // Verifica se já está cadastrado neste mesmo mapping
      const { data: ownClash } = await supabase
        .from("channel_aliases")
        .select("id")
        .eq("mapping_id", mappingId)
        .eq("alias_normalized", normalized)
        .maybeSingle();
      if (ownClash) {
        toast.info("Esse alias já está cadastrado aqui.");
        return;
      }

      // Validação backend: detecta colisão com nome principal ou alias de outro canal
      const { data: collisions, error: collErr } = await supabase.rpc(
        "check_alias_collision",
        { _alias: trimmed, _exclude_mapping_id: mappingId }
      );
      if (collErr) throw collErr;
      const collision = (collisions ?? [])[0];
      if (collision) {
        if (collision.collision_type === "name") {
          toast.error(
            `"${collision.conflicting_value}" já é o nome principal de outro canal.`
          );
        } else {
          toast.error(
            `Alias "${collision.conflicting_value}" já pertence a "${collision.mapping_name}".`
          );
        }
        return;
      }

      const { error } = await supabase.from("channel_aliases").insert({
        mapping_id: mappingId,
        alias: trimmed,
        alias_normalized: normalized,
      });
      if (error) throw error;
      setDraft("");
      invalidate();
      toast.success("Alias adicionado");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao adicionar alias");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("channel_aliases").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate();
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Aliases (nomes alternativos)</Label>
      <p className="text-[10px] text-muted-foreground -mt-1">
        Ex.: "Globo HD", "Globo SP" apontando para o mesmo canal.
      </p>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Novo alias…"
          className="h-9"
        />
        <Button
          type="button"
          size="sm"
          onClick={add}
          disabled={saving || !draft.trim()}
          className="h-9 min-h-9"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>
      {isLoading ? (
        <div className="text-[10px] text-muted-foreground">Carregando…</div>
      ) : (aliases?.length ?? 0) === 0 ? (
        <div className="text-[10px] text-muted-foreground italic">Sem aliases.</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {aliases!.map((a) => (
            <Badge key={a.id} variant="secondary" className="gap-1 pr-1 py-1">
              <span className="text-xs">{a.alias}</span>
              <button
                type="button"
                onClick={() => remove(a.id)}
                aria-label={`Remover alias ${a.alias}`}
                className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
