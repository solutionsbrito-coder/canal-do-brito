import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Link2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { normalizeChannelName } from "@/components/public/channelLogos";
import { useChannelMappings, CHANNEL_MAPPINGS_QK, CHANNEL_ALIASES_QK } from "@/hooks/useChannelMappings";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  channelName: string;
}

/**
 * Ações rápidas para um canal desconhecido detectado na importação:
 * criar canal (abre o cadastro pré-preenchido) ou adicionar como alias de um existente.
 */
export const UnknownChannelActions = ({ channelName }: Props) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: mappings } = useChannelMappings();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const options = (() => {
    if (!mappings) return [];
    const uniq = new Map<string, { id: string; name: string }>();
    for (const m of mappings.values()) uniq.set(m.id, { id: m.id, name: m.name });
    const q = normalizeChannelName(query);
    return [...uniq.values()]
      .filter((o) => !q || normalizeChannelName(o.name).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 8);
  })();

  const addAlias = async (mappingId: string, mappingName: string) => {
    const trimmed = channelName.trim();
    const normalized = normalizeChannelName(trimmed);
    if (!normalized) return;
    setSaving(true);
    try {
      const { data: collisions, error: collErr } = await supabase.rpc("check_alias_collision", {
        _alias: trimmed,
        _exclude_mapping_id: mappingId,
      });
      if (collErr) throw collErr;
      const c = (collisions ?? [])[0];
      if (c) {
        toast.error(`"${c.conflicting_value}" já pertence a "${c.mapping_name}".`);
        return;
      }
      const { error } = await supabase.from("channel_aliases").insert({
        mapping_id: mappingId,
        alias: trimmed,
        alias_normalized: normalized,
      });
      if (error) throw error;
      toast.success(`"${trimmed}" agora é apelido de ${mappingName}.`);
      qc.invalidateQueries({ queryKey: CHANNEL_MAPPINGS_QK });
      qc.invalidateQueries({ queryKey: CHANNEL_ALIASES_QK });
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar apelido");
    } finally {
      setSaving(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => navigate(`/admin/canais-logos?novo=${encodeURIComponent(channelName)}`)}
        className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 min-h-[22px]"
        aria-label={`Criar canal ${channelName}`}
      >
        <Plus className="h-2.5 w-2.5" /> Criar canal
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border border-sky-500/40 text-sky-300 hover:bg-sky-500/10 min-h-[22px]"
            aria-label={`Adicionar ${channelName} como apelido de um canal existente`}
          >
            <Link2 className="h-2.5 w-2.5" /> Apelido de…
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2 space-y-2">
          <p className="text-[11px] text-muted-foreground">
            "<span className="font-semibold text-foreground">{channelName}</span>" é apelido de:
          </p>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar canal…"
            className="h-9 text-xs"
            aria-label="Buscar canal cadastrado"
            autoFocus
          />
          <ul className="max-h-48 overflow-y-auto space-y-0.5" role="listbox">
            {options.length === 0 && (
              <li className="text-[11px] text-muted-foreground px-2 py-1">Nenhum canal encontrado.</li>
            )}
            {options.map((o) => (
              <li key={o.id}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  onClick={() => addAlias(o.id, o.name)}
                  className="w-full justify-start h-9 text-xs"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
                  {o.name}
                </Button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </span>
  );
};
