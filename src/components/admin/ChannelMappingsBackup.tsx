import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  CHANNEL_MAPPINGS_QK,
  CHANNEL_ALIASES_QK,
  type ChannelMapping,
  type ChannelAlias,
} from "@/hooks/useChannelMappings";
import { normalizeChannelName } from "@/components/public/channelLogos";

type BackupShape = {
  version: 1;
  exportedAt: string;
  mappings: Array<Partial<ChannelMapping>>;
  aliases: Array<{ mapping_name_normalized: string; alias: string }>;
};

const FILENAME = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `canais-logos-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
};

export function ChannelMappingsBackup() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [pending, setPending] = useState<{
    backup: BackupShape;
    summary: { mappings: number; aliases: number };
  } | null>(null);

  const handleExport = async () => {
    setBusy("export");
    try {
      const [{ data: mappings, error: mErr }, { data: aliases, error: aErr }] = await Promise.all([
        supabase.from("channel_logo_mappings").select("*").order("sort_order").order("name"),
        supabase.from("channel_aliases").select("*"),
      ]);
      if (mErr) throw mErr;
      if (aErr) throw aErr;

      const byId = new Map<string, ChannelMapping>(
        ((mappings ?? []) as ChannelMapping[]).map((m) => [m.id, m])
      );

      const payload: BackupShape = {
        version: 1,
        exportedAt: new Date().toISOString(),
        mappings: ((mappings ?? []) as ChannelMapping[]).map((m) => ({
          name: m.name,
          name_normalized: m.name_normalized,
          logo_key: m.logo_key,
          short: m.short,
          active: m.active,
          custom_logo_url: m.custom_logo_url,
          light_chip: m.light_chip,
          sort_order: m.sort_order,
        })),
        aliases: ((aliases ?? []) as ChannelAlias[])
          .map((a) => {
            const m = byId.get(a.mapping_id);
            if (!m) return null;
            return { mapping_name_normalized: m.name_normalized, alias: a.alias };
          })
          .filter((x): x is { mapping_name_normalized: string; alias: string } => !!x),
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = FILENAME();
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Backup exportado: ${payload.mappings.length} canais, ${payload.aliases.length} aliases`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao exportar");
    } finally {
      setBusy(null);
    }
  };

  const handleFile = async (file: File) => {
    setBusy("import");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.mappings) || !Array.isArray(parsed.aliases)) {
        throw new Error("Formato inválido — esperado backup version 1");
      }
      setPending({
        backup: parsed as BackupShape,
        summary: { mappings: parsed.mappings.length, aliases: parsed.aliases.length },
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Arquivo inválido");
    } finally {
      setBusy(null);
    }
  };

  const confirmImport = async () => {
    if (!pending) return;
    setBusy("import");
    try {
      const { backup } = pending;

      // 1) Upsert mappings by name_normalized
      const mappingPayload = backup.mappings
        .filter((m) => m.name && m.name_normalized)
        .map((m) => ({
          name: m.name!,
          name_normalized: m.name_normalized!,
          logo_key: m.logo_key ?? "none",
          short: m.short ?? null,
          active: m.active ?? true,
          custom_logo_url: m.custom_logo_url ?? null,
          light_chip: m.light_chip ?? false,
          sort_order: m.sort_order ?? 0,
        }));

      if (mappingPayload.length) {
        const { error } = await supabase
          .from("channel_logo_mappings")
          .upsert(mappingPayload, { onConflict: "name_normalized" });
        if (error) throw error;
      }

      // 2) Resolve mapping_id by name_normalized
      const norms = Array.from(new Set(mappingPayload.map((m) => m.name_normalized)));
      const { data: refreshed, error: rErr } = await supabase
        .from("channel_logo_mappings")
        .select("id, name_normalized")
        .in("name_normalized", norms);
      if (rErr) throw rErr;
      const idByNorm = new Map<string, string>(
        (refreshed ?? []).map((r: any) => [r.name_normalized as string, r.id as string])
      );

      // 3) Upsert aliases (skip ones whose mapping wasn't found / collisions)
      const aliasRows = backup.aliases
        .map((a) => {
          const mappingId = idByNorm.get(a.mapping_name_normalized);
          if (!mappingId || !a.alias) return null;
          const aliasNorm = normalizeChannelName(a.alias);
          if (!aliasNorm) return null;
          return {
            mapping_id: mappingId,
            alias: a.alias,
            alias_normalized: aliasNorm,
          };
        })
        .filter((x): x is { mapping_id: string; alias: string; alias_normalized: string } => !!x);

      let aliasInserted = 0;
      if (aliasRows.length) {
        // Insert ignoring duplicates one-by-one to avoid full failure on collisions
        const { data: existingAliases } = await supabase
          .from("channel_aliases")
          .select("alias_normalized");
        const existing = new Set((existingAliases ?? []).map((a: any) => a.alias_normalized));
        const toInsert = aliasRows.filter((a) => !existing.has(a.alias_normalized));
        if (toInsert.length) {
          const { error } = await supabase.from("channel_aliases").insert(toInsert);
          if (error) throw error;
          aliasInserted = toInsert.length;
        }
      }

      qc.invalidateQueries({ queryKey: ["channel_logo_mappings_admin"] });
      qc.invalidateQueries({ queryKey: CHANNEL_MAPPINGS_QK, refetchType: "active" });
      qc.invalidateQueries({ queryKey: CHANNEL_ALIASES_QK });
      qc.invalidateQueries({ queryKey: ["discovered-channels"] });

      toast.success(
        `Importado: ${mappingPayload.length} mapeamentos, ${aliasInserted} aliases novos`
      );
      setPending(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao importar");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={busy !== null}
        className="gap-2 flex-1 sm:flex-none min-h-11"
        aria-label="Exportar mapeamentos como JSON"
      >
        {busy === "export" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Exportar
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={busy !== null}
        className="gap-2 flex-1 sm:flex-none min-h-11"
        aria-label="Importar mapeamentos de JSON"
      >
        {busy === "import" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        Importar
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar importação</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  O arquivo contém <strong>{pending?.summary.mappings}</strong> mapeamentos e{" "}
                  <strong>{pending?.summary.aliases}</strong> aliases.
                </p>
                <p className="text-muted-foreground">
                  Mapeamentos com mesmo nome normalizado serão sobrescritos. Aliases já existentes
                  (mesmo alias normalizado) serão ignorados para evitar conflitos.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <AlertDialogCancel className="min-h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport} className="min-h-11">
              Importar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
