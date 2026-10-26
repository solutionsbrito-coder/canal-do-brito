import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { mappingHasLogo } from "@/lib/channelResolver";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Pencil, Trash2, Plus, Search, AlertTriangle, RefreshCcw, CheckCircle2, Sparkles, GripVertical, Eye, BellOff, Link2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { LOGO_OPTIONS, LOGO_REGISTRY, normalizeChannelName, type LogoKey } from "@/components/public/channelLogos";
import { ChannelBadge, BUILTIN_CHANNEL_MAP } from "@/components/public/ChannelBadge";
import { CHANNEL_MAPPINGS_QK, CHANNEL_ALIASES_QK, type ChannelMapping, type ChannelAlias } from "@/hooks/useChannelMappings";
import { useDiscoveredChannels, type DiscoveredChannel } from "@/hooks/useDiscoveredChannels";
import { useChannelMatchSuggestions, type ChannelMatchSuggestion } from "@/hooks/useChannelMatchSuggestion";
import { ChannelLogoUpload } from "@/components/admin/ChannelLogoUpload";
import { ChannelPreviewStage } from "@/components/admin/ChannelPreviewStage";
import { ChannelAliasesEditor } from "@/components/admin/ChannelAliasesEditor";
import { ChannelMappingsBackup } from "@/components/admin/ChannelMappingsBackup";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const CHANNEL_TYPES = [
  { value: "tv_aberta", label: "TV aberta" },
  { value: "tv_fechada", label: "TV fechada" },
  { value: "streaming", label: "Streaming" },
  { value: "youtube", label: "YouTube" },
  { value: "ppv", label: "Pay-per-view" },
  { value: "outro", label: "Outro" },
] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number]["value"];

type FormState = {
  id?: string;
  name: string;
  logo_key: LogoKey;
  short: string;
  active: boolean;
  custom_logo_url: string | null;
  light_chip: boolean;
  channel_type: ChannelType;
  primary_color: string;
  /** Apelidos iniciais (só no cadastro novo), separados por vírgula. */
  initial_aliases: string;
};

export type ChannelStatusFilter = "todos" | "sem-logo" | "com-logo" | "conflitos" | "inativos";
const STATUS_FILTERS: Array<{ value: ChannelStatusFilter; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "sem-logo", label: "Sem logo" },
  { value: "com-logo", label: "Com logo" },
  { value: "conflitos", label: "Conflitos" },
  { value: "inativos", label: "Inativos" },
];

const EMPTY_FORM: FormState = {
  name: "",
  logo_key: "none",
  short: "",
  active: true,
  custom_logo_url: null,
  light_chip: false,
  channel_type: "outro",
  primary_color: "",
  initial_aliases: "",
};

/** Sugere o tipo do canal a partir do nome. */
function guessChannelType(name: string): ChannelType {
  const n = name.toLowerCase();
  if (/youtube|cazé|caze|goat|canal do|desimpedidos/.test(n)) return "youtube";
  if (/globo$|band$|record|sbt|redetv|tv brasil|cultura/.test(n)) return "tv_aberta";
  if (/sportv|espn|premiere|combate|tnt|band ?sports|fox|space|ge tv/.test(n)) return "tv_fechada";
  if (/disney|max|prime|paramount|globoplay|dazn|apple|netflix|nsports|xsports|league pass|onefootball|star\+/.test(n)) return "streaming";
  if (/pay|ppv|combate play|ufc fight pass/.test(n)) return "ppv";
  return "outro";
}

type AutoLinkPair = { orphan: DiscoveredChannel; suggestion: ChannelMatchSuggestion };
type ConfirmState =
  | { kind: "delete-mapping"; id: string; name: string }
  | { kind: "bulk-silence"; count: number }
  | { kind: "bulk-autolink"; pairs: AutoLinkPair[] }
  | { kind: "merge"; sourceId: string; sourceName: string; targetId: string; targetName: string }
  | {
      kind: "undo-autolink";
      aliasIds: string[];
      createdMappingIds: string[];
      inserted: number;
    }
  | null;

const AdminCanaisLogos = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [logoTab, setLogoTab] = useState<"registry" | "upload">("registry");
  const [testName, setTestName] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"orphans" | "all" | "custom" | "builtin">("orphans");
  const [previewChannel, setPreviewChannel] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [mergeTarget, setMergeTarget] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<ChannelStatusFilter>("todos");
  const [searchParams, setSearchParams] = useSearchParams();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: rows, isLoading } = useQuery({
    queryKey: ["channel_logo_mappings_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channel_logo_mappings")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name");
      if (error) throw error;
      return (data ?? []) as ChannelMapping[];
    },
  });

  const discovered = useDiscoveredChannels();

  const { data: allAliases } = useQuery({
    queryKey: [...CHANNEL_ALIASES_QK, "all-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channel_aliases")
        .select("id, mapping_id, alias, alias_normalized");
      if (error) throw error;
      return (data ?? []) as ChannelAlias[];
    },
  });

  /** Apelidos por canal + conjunto de canais com alias em conflito. */
  const aliasInfo = useMemo(() => {
    const byMapping = new Map<string, string[]>();
    const conflicts = new Set<string>();
    const nameOwner = new Map<string, string>();
    for (const r of rows ?? []) nameOwner.set(r.name_normalized, r.id);
    const seen = new Map<string, string>();
    for (const a of allAliases ?? []) {
      const list = byMapping.get(a.mapping_id) ?? [];
      list.push(a.alias);
      byMapping.set(a.mapping_id, list);
      const owner = nameOwner.get(a.alias_normalized);
      if (owner && owner !== a.mapping_id) { conflicts.add(owner); conflicts.add(a.mapping_id); }
      const prev = seen.get(a.alias_normalized);
      if (prev && prev !== a.mapping_id) { conflicts.add(prev); conflicts.add(a.mapping_id); }
      seen.set(a.alias_normalized, a.mapping_id);
    }
    return { byMapping, conflicts };
  }, [allAliases, rows]);

  // Deep-links: ?novo=Nome abre o cadastro; ?filtro=sem-logo|conflitos|... aplica filtro.
  useEffect(() => {
    const novo = searchParams.get("novo");
    const filtro = searchParams.get("filtro") as ChannelStatusFilter | null;
    if (filtro && STATUS_FILTERS.some((f) => f.value === filtro)) {
      setStatusFilter(filtro);
      setTab("custom");
    }
    if (novo) {
      setForm({ ...EMPTY_FORM, name: novo, channel_type: guessChannelType(novo) });
      setLogoTab("upload");
      setOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("novo");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const upsert = useMutation({
    mutationFn: async (f: FormState) => {
      const trimmedName = f.name.trim();
      const nameNorm = normalizeChannelName(f.name);
      if (!trimmedName) throw new Error("Nome obrigatório");
      if (!nameNorm) throw new Error("Nome inválido (após normalização ficou vazio)");

      // Pré-checa colisão de name_normalized para dar mensagem clara
      // (em vez do erro genérico 23505 do Postgres).
      const { data: clash } = await supabase
        .from("channel_logo_mappings")
        .select("id, name")
        .eq("name_normalized", nameNorm)
        .maybeSingle();
      if (clash && clash.id !== f.id) {
        throw new Error(
          `Já existe um mapeamento com o mesmo nome normalizado ("${clash.name}"). Use outro nome ou edite o existente.`
        );
      }

      const payload = {
        name: trimmedName,
        name_normalized: nameNorm,
        logo_key: f.logo_key,
        short: f.short.trim() || null,
        active: f.active,
        custom_logo_url: f.custom_logo_url,
        light_chip: f.light_chip,
        channel_type: f.channel_type,
        primary_color: /^#[0-9a-fA-F]{6}$/.test(f.primary_color.trim()) ? f.primary_color.trim().toLowerCase() : null,
      };
      if (f.id) {
        const { error } = await supabase.from("channel_logo_mappings").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase
          .from("channel_logo_mappings")
          .upsert(payload, { onConflict: "name_normalized" })
          .select("id")
          .single();
        if (error) throw error;
        const aliases = f.initial_aliases
          .split(",")
          .map((a) => a.trim())
          .filter((a) => a && normalizeChannelName(a) && normalizeChannelName(a) !== nameNorm);
        if (created?.id && aliases.length) {
          const uniq = new Map<string, string>();
          for (const a of aliases) uniq.set(normalizeChannelName(a), a);
          const skipped: string[] = [];
          const toInsert: Array<{ mapping_id: string; alias: string; alias_normalized: string }> = [];
          for (const [norm, alias] of uniq) {
            const { data: coll } = await supabase.rpc("check_alias_collision", { _alias: alias, _exclude_mapping_id: created.id });
            if ((coll ?? []).length) skipped.push(alias);
            else toInsert.push({ mapping_id: created.id, alias, alias_normalized: norm });
          }
          if (toInsert.length) {
            const { error: aErr } = await supabase.from("channel_aliases").insert(toInsert);
            if (aErr) throw aErr;
          }
          if (skipped.length) toast.warning(`Apelidos ignorados por conflito: ${skipped.join(", ")}`);
        }
      }
    },
    onSuccess: () => {
      toast.success("Mapeamento salvo");
      qc.invalidateQueries({ queryKey: ["channel_logo_mappings_admin"] });
      qc.invalidateQueries({ queryKey: CHANNEL_MAPPINGS_QK, refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["discovered-channels"] });
      qc.invalidateQueries({ queryKey: CHANNEL_ALIASES_QK });
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => {
      const msg = e?.message || e?.details || e?.hint || "Erro ao salvar";
      console.error("[AdminCanaisLogos] upsert error", e);
      toast.error(msg);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("channel_logo_mappings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: ["channel_logo_mappings_admin"] });
      qc.invalidateQueries({ queryKey: CHANNEL_MAPPINGS_QK });
      qc.invalidateQueries({ queryKey: ["discovered-channels"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });

  const mergeInto = useMutation({
    mutationFn: async ({ sourceId, targetId }: { sourceId: string; targetId: string }) => {
      const { data, error } = await supabase.rpc("merge_channel_mappings", { _source_id: sourceId, _target_id: targetId });
      if (error) throw error;
      return (data as number) ?? 0;
    },
    onSuccess: (updated) => {
      toast.success(`Canais mesclados${updated ? ` · ${updated} jogo(s) atualizado(s)` : ""}`);
      qc.invalidateQueries({ queryKey: ["channel_logo_mappings_admin"] });
      qc.invalidateQueries({ queryKey: CHANNEL_MAPPINGS_QK });
      qc.invalidateQueries({ queryKey: ["discovered-channels"] });
      qc.invalidateQueries({ queryKey: ["daily_games"] });
      setMergeTarget("");
      setOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao mesclar"),
  });

  const reorder = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const { error } = await supabase.rpc("reorder_channel_mappings", { _ids: orderedIds });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channel_logo_mappings_admin"] });
      qc.invalidateQueries({ queryKey: CHANNEL_MAPPINGS_QK });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao reordenar"),
  });

  const bulkSilence = useMutation({
    mutationFn: async (orphans: DiscoveredChannel[]) => {
      const payload = orphans.map((o) => ({
        name: o.name,
        name_normalized: o.normalized,
        logo_key: "none" as LogoKey,
        active: true,
        light_chip: false,
      }));
      if (!payload.length) return;
      const { error } = await supabase
        .from("channel_logo_mappings")
        .upsert(payload, { onConflict: "name_normalized" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Canais silenciados");
      qc.invalidateQueries({ queryKey: ["channel_logo_mappings_admin"] });
      qc.invalidateQueries({ queryKey: CHANNEL_MAPPINGS_QK });
      qc.invalidateQueries({ queryKey: ["discovered-channels"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao silenciar"),
  });

  const linkAsAlias = useMutation({
    mutationFn: async (pairs: AutoLinkPair[]) => {
      // 1) ensure target mapping exists for builtin targets (create on the fly)
      const builtinPairs = pairs.filter((p) => p.suggestion.target.kind === "builtin");
      const builtinByNorm = new Map<string, { name: string; logoKey: LogoKey }>();
      for (const p of builtinPairs) {
        if (p.suggestion.target.kind !== "builtin") continue;
        builtinByNorm.set(p.suggestion.target.normalized, {
          name: p.suggestion.target.builtinName,
          logoKey: p.suggestion.target.logoKey,
        });
      }
      const builtinNorms = Array.from(builtinByNorm.keys());
      const created = new Map<string, string>(); // normalized -> mapping id
      const freshlyCreatedIds: string[] = [];
      if (builtinNorms.length) {
        const { data: existing, error: exErr } = await supabase
          .from("channel_logo_mappings")
          .select("id, name_normalized")
          .in("name_normalized", builtinNorms);
        if (exErr) throw exErr;
        for (const r of (existing ?? []) as Array<{ id: string; name_normalized: string }>) {
          created.set(r.name_normalized, r.id);
        }
        const missing = builtinNorms.filter((n) => !created.has(n));
        if (missing.length) {
          const insertPayload = missing.map((n) => {
            const b = builtinByNorm.get(n)!;
            return {
              name: b.name,
              name_normalized: n,
              logo_key: b.logoKey,
              active: true,
              light_chip: false,
            };
          });
          const { data: inserted, error: insErr } = await supabase
            .from("channel_logo_mappings")
            .insert(insertPayload)
            .select("id, name_normalized");
          if (insErr) throw insErr;
          for (const r of (inserted ?? []) as Array<{ id: string; name_normalized: string }>) {
            created.set(r.name_normalized, r.id);
            freshlyCreatedIds.push(r.id);
          }
        }
      }

      // 2) build alias rows
      const aliasRows = pairs
        .map((p) => {
          let mappingId: string | undefined;
          if (p.suggestion.target.kind === "mapping") mappingId = p.suggestion.target.mapping.id;
          else mappingId = created.get(p.suggestion.target.normalized);
          if (!mappingId) return null;
          return {
            mapping_id: mappingId,
            alias: p.orphan.name,
            alias_normalized: p.orphan.normalized,
          };
        })
        .filter((x): x is { mapping_id: string; alias: string; alias_normalized: string } => !!x);

      if (!aliasRows.length) return { inserted: 0, aliasIds: [] as string[], createdMappingIds: [] as string[] };
      const createdMappingIds = freshlyCreatedIds;

      const { data: insertedAliases, error } = await supabase
        .from("channel_aliases")
        .upsert(aliasRows, { onConflict: "alias_normalized" })
        .select("id");
      if (error) throw error;
      const aliasIds = (insertedAliases ?? []).map((r: any) => r.id as string);
      return { inserted: aliasRows.length, aliasIds, createdMappingIds };
    },
    onSuccess: ({ inserted, aliasIds, createdMappingIds }) => {
      qc.invalidateQueries({ queryKey: ["channel_logo_mappings_admin"] });
      qc.invalidateQueries({ queryKey: CHANNEL_MAPPINGS_QK });
      qc.invalidateQueries({ queryKey: CHANNEL_ALIASES_QK });
      qc.invalidateQueries({ queryKey: ["discovered-channels"] });
      if (!inserted) {
        toast.info("Nenhum alias novo criado");
        return;
      }
      toast.success(
        `${inserted} canal${inserted > 1 ? "is" : ""} vinculado${inserted > 1 ? "s" : ""} como alias`,
        {
          action: {
            label: "Desfazer",
            onClick: () => {
              if (aliasIds.length + createdMappingIds.length === 0) return;
              setConfirm({
                kind: "undo-autolink",
                aliasIds,
                createdMappingIds,
                inserted,
              });
            },
          },
          duration: 10_000,
        }
      );
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao vincular alias"),
  });

  const undoAutolink = async (aliasIds: string[], createdMappingIds: string[]) => {
    try {
      if (aliasIds.length) {
        const { error: delErr } = await supabase
          .from("channel_aliases")
          .delete()
          .in("id", aliasIds);
        if (delErr) throw delErr;
      }
      if (createdMappingIds.length) {
        await supabase
          .from("channel_logo_mappings")
          .delete()
          .in("id", createdMappingIds);
      }
      qc.invalidateQueries({ queryKey: ["channel_logo_mappings_admin"] });
      qc.invalidateQueries({ queryKey: CHANNEL_MAPPINGS_QK });
      qc.invalidateQueries({ queryKey: CHANNEL_ALIASES_QK });
      qc.invalidateQueries({ queryKey: ["discovered-channels"] });
      toast.success("Vínculo desfeito");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao desfazer");
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id || !rows) return;
    const ids = rows.map((r) => r.id);
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx < 0 || newIdx < 0) return;
    const newOrder = arrayMove(ids, oldIdx, newIdx);
    qc.setQueryData<ChannelMapping[]>(["channel_logo_mappings_admin"], (old) => {
      if (!old) return old;
      return arrayMove(old, oldIdx, newIdx);
    });
    reorder.mutate(newOrder);
  };

  const builtinList = useMemo(
    () =>
      Object.entries(BUILTIN_CHANNEL_MAP)
        .filter(([, v]) => v.logoKey)
        .map(([name, v]) => ({ name, logoKey: v.logoKey as LogoKey })),
    []
  );

  const suggestions = useChannelMatchSuggestions(discovered.orphans, rows, builtinList);
  const highConfidencePairs = useMemo<AutoLinkPair[]>(() => {
    const out: AutoLinkPair[] = [];
    for (const o of discovered.orphans) {
      const s = suggestions.get(o.normalized);
      if (s && s.confidence === "high") out.push({ orphan: o, suggestion: s });
    }
    return out;
  }, [discovered.orphans, suggestions]);
  const mediumConfidencePairs = useMemo<AutoLinkPair[]>(() => {
    const out: AutoLinkPair[] = [];
    for (const o of discovered.orphans) {
      const s = suggestions.get(o.normalized);
      if (s && s.confidence === "medium") out.push({ orphan: o, suggestion: s });
    }
    return out;
  }, [discovered.orphans, suggestions]);
  const allConfidencePairs = useMemo<AutoLinkPair[]>(
    () => [...highConfidencePairs, ...mediumConfidencePairs],
    [highConfidencePairs, mediumConfidencePairs]
  );

  const stats = useMemo(() => {
    return {
      mapped: rows?.length ?? 0,
      orphans: discovered.orphans.length,
      builtin: builtinList.length,
      discovered: discovered.all.length,
      suggested: suggestions.size,
    };
  }, [rows, discovered, builtinList, suggestions]);

  const openEdit = (r: ChannelMapping) => {
    setForm({
      id: r.id,
      name: r.name,
      logo_key: r.logo_key,
      short: r.short ?? "",
      active: r.active,
      custom_logo_url: r.custom_logo_url ?? null,
      light_chip: !!r.light_chip,
      channel_type: (r.channel_type as ChannelType) ?? "outro",
      primary_color: r.primary_color ?? "",
      initial_aliases: "",
    });
    setLogoTab(r.custom_logo_url ? "upload" : "registry");
    setOpen(true);
  };

  const openNew = (prefillName?: string) => {
    setForm({ ...EMPTY_FORM, name: prefillName ?? "", channel_type: prefillName ? guessChannelType(prefillName) : "outro" });
    setLogoTab(prefillName ? "upload" : "registry");
    setOpen(true);
  };

  // Filtered list for current tab
  const visibleCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qNorm = normalizeChannelName(search);
    const matches = (s: string) => {
      if (!q) return true;
      const lower = s.toLowerCase();
      const norm = normalizeChannelName(s);
      return lower.includes(q) || (qNorm && norm.includes(qNorm));
    };
    const filterByQuery = <T extends { name: string }>(arr: T[]) =>
      q ? arr.filter((i) => matches(i.name)) : arr;

    if (tab === "orphans") return filterByQuery(discovered.orphans);
    if (tab === "all") return filterByQuery(discovered.all.filter((i) => !i.isOrphan));
    if (tab === "custom") {
      const list: DiscoveredChannel[] = (rows ?? [])
        .filter((r) => {
          if (statusFilter === "sem-logo") return !mappingHasLogo(r);
          if (statusFilter === "com-logo") return mappingHasLogo(r);
          if (statusFilter === "conflitos") return aliasInfo.conflicts.has(r.id);
          if (statusFilter === "inativos") return !r.active;
          return true;
        })
        .map((r) => ({
          name: r.name,
          normalized: r.name_normalized,
          count: discovered.all.find((d) => d.normalized === r.name_normalized)?.count ?? 0,
          mapping: r,
          isBuiltin: false,
          isOrphan: false,
        }));
      if (!q) return list;
      // Busca por nome OU apelido
      return list.filter((i) => matches(i.name) || (aliasInfo.byMapping.get(i.mapping!.id) ?? []).some(matches));
    }
    return filterByQuery(
      builtinList.map<DiscoveredChannel>((b) => ({
        name: b.name,
        normalized: normalizeChannelName(b.name),
        count: discovered.all.find((d) => d.normalized === normalizeChannelName(b.name))?.count ?? 0,
        isBuiltin: true,
        isOrphan: false,
      }))
    );
  }, [tab, search, discovered, rows, builtinList, statusFilter, aliasInfo]);

  const coverage = discovered.coverage ?? 100;
  const topOrphans = discovered.topOrphans ?? [];

  return (
    <div className="space-y-6 pb-[env(safe-area-inset-bottom)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Canais & Logos</h1>
          <p className="text-sm text-muted-foreground">
            Painel central de canais detectados, com upload de logo direto da tela.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ChannelMappingsBackup />
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await Promise.all([
                qc.invalidateQueries({ queryKey: ["channel_logo_mappings_admin"] }),
                qc.invalidateQueries({ queryKey: CHANNEL_MAPPINGS_QK, refetchType: "active" }),
                qc.invalidateQueries({ queryKey: CHANNEL_ALIASES_QK }),
              ]);
              await discovered.refetch();
              setTab("orphans");
              toast.success("Lista atualizada");
            }}
            disabled={discovered.isLoading}
            className="gap-2 flex-1 sm:flex-none min-h-11"
            aria-label="Detectar canais sem logo agora"
          >
            <RefreshCcw className={`h-4 w-4 ${discovered.isLoading ? "animate-spin" : ""}`} />{" "}
            Detectar agora
          </Button>
          <Button onClick={() => openNew()} className="gap-2 flex-1 sm:flex-none min-h-11">
            <Plus className="h-4 w-4" /> Novo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Sparkles className="h-4 w-4" />}
          label="Detectados (90d)"
          value={stats.discovered}
          onClick={() => setTab("all")}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          label="Personalizados"
          value={stats.mapped}
          onClick={() => setTab("custom")}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4 text-sky-400" />}
          label="Built-in"
          value={stats.builtin}
          onClick={() => setTab("builtin")}
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
          label="Sem logo"
          value={stats.orphans}
          highlight={stats.orphans > 0}
          onClick={() => setTab("orphans")}
          sub={stats.suggested > 0 ? `${stats.suggested} provável${stats.suggested > 1 ? "is" : ""} variante${stats.suggested > 1 ? "s" : ""}` : undefined}
        />
      </div>

      {/* Cobertura de logos */}
      <div className="rounded-lg border border-border/50 bg-card/40 p-4 space-y-2">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-semibold">Cobertura de logos</span>
          <span className="tabular-nums font-bold text-primary">{coverage}%</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted/40"
          role="progressbar"
          aria-valuenow={coverage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Cobertura de logos dos canais em uso"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all"
            style={{ width: `${coverage}%` }}
          />
        </div>
        {topOrphans.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] text-muted-foreground">Mais frequentes sem logo:</span>
            {topOrphans.map((o) => (
              <button
                key={o.normalized}
                onClick={() => openNew(o.name)}
                className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-100 hover:bg-amber-500/20"
              >
                {o.name} · {o.count}
              </button>
            ))}
          </div>
        )}
      </div>

      {stats.orphans > 0 && (
        <button
          onClick={() => setTab("orphans")}
          className="w-full rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-200 hover:bg-amber-500/15 transition min-h-11"
        >
          <span className="font-bold">⚠ {stats.orphans} canal{stats.orphans > 1 ? "is" : ""} sem logo</span>{" "}
          aparece{stats.orphans > 1 ? "m" : ""} nos jogos. Toque para resolver →
        </button>
      )}


      {/* Teste de matching */}
      <div className="rounded-lg border border-border/50 bg-card/40 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Search className="h-4 w-4 text-primary" /> Teste de matching
        </div>
        <p className="text-xs text-muted-foreground">
          Cole o nome de um canal exatamente como vem do parser e veja qual badge aparece agora.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="Ex: Bandsports HD"
            className="max-w-xs"
          />
          {testName.trim() && <ChannelBadge name={testName.trim()} size="md" />}
        </div>
      </div>

      {/* Preview ao vivo */}
      <div id="preview-stage">
        <ChannelPreviewStage value={previewChannel} onChange={setPreviewChannel} />
      </div>
      <div className="space-y-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <div className="flex flex-col gap-2">
            <div className="-mx-1 overflow-x-auto px-1">
              <TabsList className="w-max">
                <TabsTrigger value="orphans" className="gap-2">
                  Sem logo
                  {stats.orphans > 0 && (
                    <span className="rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-bold px-1.5">
                      {stats.orphans}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all">Com logo</TabsTrigger>
                <TabsTrigger value="custom" className="gap-2">
                  Cadastrados
                  {aliasInfo.conflicts.size > 0 && (
                    <span className="rounded-full bg-rose-500/30 text-rose-200 text-[10px] font-bold px-1.5" title="Canais com apelido em conflito">
                      {aliasInfo.conflicts.size}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="builtin">Built-in</TabsTrigger>
              </TabsList>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === "custom" ? "Buscar por nome ou apelido…" : "Buscar canal…"}
                className="pl-9 h-10"
                aria-label="Buscar canal"
              />
            </div>
            {tab === "custom" && (
              <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5" role="radiogroup" aria-label="Filtrar canais cadastrados">
                {STATUS_FILTERS.map((f) => {
                  const active = statusFilter === f.value;
                  const count =
                    f.value === "todos" ? rows?.length ?? 0 :
                    f.value === "sem-logo" ? (rows ?? []).filter((r) => !mappingHasLogo(r)).length :
                    f.value === "com-logo" ? (rows ?? []).filter((r) => mappingHasLogo(r)).length :
                    f.value === "conflitos" ? aliasInfo.conflicts.size :
                    (rows ?? []).filter((r) => !r.active).length;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setStatusFilter(f.value)}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 min-h-9 text-xs font-semibold transition-colors ${
                        active
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border/50 bg-card/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f.label}
                      <span className="text-[10px] opacity-70 tabular-nums">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <TabsContent value={tab} className="mt-4">
            {tab === "orphans" && (highConfidencePairs.length > 0 || mediumConfidencePairs.length > 0) && !search && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <div className="text-xs text-emerald-100">
                  ✨ <span className="font-bold">{highConfidencePairs.length}</span> alta confiança
                  {mediumConfidencePairs.length > 0 && (
                    <> · <span className="font-bold">{mediumConfidencePairs.length}</span> média confiança</>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {highConfidencePairs.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => setConfirm({ kind: "bulk-autolink", pairs: highConfidencePairs })}
                      disabled={linkAsAlias.isPending}
                      className="gap-2 min-h-10 bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      Auto-vincular {highConfidencePairs.length} (alta)
                    </Button>
                  )}
                  {mediumConfidencePairs.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirm({ kind: "bulk-autolink", pairs: allConfidencePairs })}
                      disabled={linkAsAlias.isPending}
                      className="gap-2 min-h-10 border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/10"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      Incluir média ({allConfidencePairs.length})
                    </Button>
                  )}
                </div>
              </div>
            )}

            {tab === "orphans" && discovered.orphans.length > 0 && !search && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 bg-card/30 p-3">
                <div className="text-xs text-muted-foreground">
                  Não vai usar logo nesses canais? Silencie todos de uma vez.
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setConfirm({ kind: "bulk-silence", count: discovered.orphans.length })
                  }
                  disabled={bulkSilence.isPending}
                  className="gap-2 min-h-10"
                >
                  <BellOff className="h-3.5 w-3.5" />
                  Silenciar {discovered.orphans.length}
                </Button>
              </div>
            )}

            {(tab === "orphans" || tab === "all") && discovered.isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando canais detectados…</div>
            ) : tab === "custom" && isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando…</div>
            ) : visibleCards.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground space-y-3">
                <p>
                  {tab === "orphans"
                    ? "Todos os canais detectados já têm logo."
                    : (rows ?? []).length === 0
                      ? "Nenhum canal cadastrado ainda."
                      : "Nenhum canal encontrado para essa busca ou filtro."}
                </p>
                {(rows ?? []).length === 0 ? (
                  <Button size="sm" onClick={() => openNew()} className="min-h-11 gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Cadastrar canal
                  </Button>
                ) : tab !== "orphans" ? (
                  <Button size="sm" variant="outline" onClick={() => { setSearch(""); setStatusFilter("todos"); }} className="min-h-11">
                    Limpar filtros
                  </Button>
                ) : null}
              </div>
            ) : tab === "custom" ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={(rows ?? []).map((r) => r.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {visibleCards.map((c) =>
                      c.mapping ? (
                        <SortableChannelRow
                          key={c.mapping.id}
                          id={c.mapping.id}
                          channel={c}
                          aliases={aliasInfo.byMapping.get(c.mapping.id) ?? []}
                          conflict={aliasInfo.conflicts.has(c.mapping.id)}
                          onEdit={() => openEdit(c.mapping!)}
                          onDelete={() =>
                            setConfirm({
                              kind: "delete-mapping",
                              id: c.mapping!.id,
                              name: c.mapping!.name,
                            })
                          }
                          onPreview={() => {
                            setPreviewChannel(c.name);
                            document.getElementById("preview-stage")?.scrollIntoView({ behavior: "smooth" });
                          }}
                        />
                      ) : null
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {visibleCards.map((c) => {
                  const sg = c.isOrphan ? suggestions.get(c.normalized) : undefined;
                  return (
                    <ChannelCard
                      key={c.normalized + (c.mapping?.id ?? "")}
                      channel={c}
                      suggestion={sg}
                      onLinkAlias={
                        sg
                          ? () =>
                              setConfirm({
                                kind: "bulk-autolink",
                                pairs: [{ orphan: c, suggestion: sg }],
                              })
                          : undefined
                      }
                      onEdit={() => (c.mapping ? openEdit(c.mapping) : openNew(c.name))}
                      onDelete={() => {
                        if (c.mapping) {
                          setConfirm({
                            kind: "delete-mapping",
                            id: c.mapping.id,
                            name: c.mapping.name,
                          });
                        }
                      }}
                      onPreview={() => {
                        setPreviewChannel(c.name);
                        document.getElementById("preview-stage")?.scrollIntoView({ behavior: "smooth" });
                      }}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar mapeamento" : "Novo mapeamento"}</DialogTitle>
            <DialogDescription>
              Associe uma logo (da biblioteca ou upload) a um nome de canal usado nos jogos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ch-name">Nome do canal</Label>
              <Input
                id="ch-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: BandSports HD"
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground">
                Normalizado: <code>{normalizeChannelName(form.name) || "—"}</code>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Logo</Label>
              <Tabs value={logoTab} onValueChange={(v) => setLogoTab(v as typeof logoTab)}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="registry">Da biblioteca</TabsTrigger>
                  <TabsTrigger value="upload">Upload personalizado</TabsTrigger>
                </TabsList>
                <TabsContent value="registry" className="mt-3 space-y-2">
                  <Select
                    value={form.logo_key}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, logo_key: v as LogoKey, custom_logo_url: null }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {LOGO_OPTIONS.map((o) => (
                        <SelectItem key={o.key} value={o.key}>
                          <div className="flex items-center gap-2">
                            {o.key !== "none" && (
                              <img
                                src={LOGO_REGISTRY[o.key as keyof typeof LOGO_REGISTRY].src}
                                alt=""
                                className="h-5 w-5 object-contain"
                              />
                            )}
                            <span>{o.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    Use uma logo já embutida no código (recomendado quando existir).
                  </p>
                </TabsContent>
                <TabsContent value="upload" className="mt-3">
                  <ChannelLogoUpload
                    channelName={form.name}
                    currentUrl={form.custom_logo_url}
                    onUploaded={(url) =>
                      setForm((f) => ({ ...f, custom_logo_url: url, logo_key: "none" }))
                    }
                    onCleared={() => setForm((f) => ({ ...f, custom_logo_url: null }))}
                  />
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ch-short">Abreviação (opcional)</Label>
              <Input
                id="ch-short"
                value={form.short}
                onChange={(e) => setForm((f) => ({ ...f, short: e.target.value }))}
                placeholder="Ex: BandSp"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ch-type">Tipo</Label>
                <select
                  id="ch-type"
                  value={form.channel_type}
                  onChange={(e) => setForm((f) => ({ ...f, channel_type: e.target.value as ChannelType }))}
                  className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {CHANNEL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ch-color">Cor principal (opcional)</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Escolher cor principal"
                    value={/^#[0-9a-fA-F]{6}$/.test(form.primary_color) ? form.primary_color : "#00ff87"}
                    onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
                    className="h-11 w-12 rounded-md border border-input bg-background p-1 cursor-pointer"
                  />
                  <Input
                    id="ch-color"
                    value={form.primary_color}
                    onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
                    placeholder="#00ff87"
                    maxLength={7}
                    className="h-11 font-mono"
                  />
                  {form.primary_color && (
                    <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => setForm((f) => ({ ...f, primary_color: "" }))}>
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="ch-light">Fundo claro</Label>
                <p className="text-[10px] text-muted-foreground">
                  Use se a logo é escura e some no chip transparente.
                </p>
              </div>
              <Switch
                id="ch-light"
                checked={form.light_chip}
                onCheckedChange={(v) => setForm((f) => ({ ...f, light_chip: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="ch-active">Ativo</Label>
              <Switch
                id="ch-active"
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
            </div>

            {form.id ? (
              <div className="rounded-md border border-border/40 bg-card/40 p-3">
                <ChannelAliasesEditor mappingId={form.id} />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="ch-aliases">Apelidos (separados por vírgula)</Label>
                <Input
                  id="ch-aliases"
                  value={form.initial_aliases}
                  onChange={(e) => setForm((f) => ({ ...f, initial_aliases: e.target.value }))}
                  placeholder="Ex: ESPN2, Espn 2, ESPN 2 HD"
                />
                <p className="text-[11px] text-muted-foreground">
                  Qualquer um desses nomes na programação vira o nome oficial acima.
                </p>
              </div>
            )}

            {form.id && (rows?.length ?? 0) > 1 && (
              <div className="rounded-md border border-amber-500/20 bg-amber-500/[0.04] p-3 space-y-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">Mesclar duplicado</p>
                  <p className="text-[11px] text-muted-foreground">
                    Move os apelidos deste canal para o canal escolhido, corrige os jogos publicados e remove este cadastro.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    aria-label="Canal de destino da mesclagem"
                    value={mergeTarget}
                    onChange={(e) => setMergeTarget(e.target.value)}
                    className="flex-1 h-11 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Escolher canal de destino…</option>
                    {(rows ?? [])
                      .filter((r) => r.id !== form.id)
                      .map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!mergeTarget || mergeInto.isPending}
                    className="min-h-11 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                    onClick={() => {
                      const target = (rows ?? []).find((r) => r.id === mergeTarget);
                      if (!target) return;
                      setConfirm({ kind: "merge", sourceId: form.id!, sourceName: form.name, targetId: target.id, targetName: target.name });
                    }}
                  >
                    Mesclar em…
                  </Button>
                </div>
              </div>
            )}

            {form.name.trim() && (
              <div className="rounded-md border border-border/40 bg-card/40 p-3 space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Preview ao vivo
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ChannelBadge name={form.name.trim()} size="sm" />
                  <ChannelBadge name={form.name.trim()} size="md" />
                  <ChannelBadge name={form.name.trim()} size="lg" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            {form.id && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive sm:mr-auto min-h-11"
                onClick={() =>
                  setConfirm({ kind: "delete-mapping", id: form.id!, name: form.name })
                }
              >
                <Trash2 className="h-4 w-4 mr-1" /> Remover
              </Button>
            )}
            <Button variant="ghost" onClick={() => setOpen(false)} className="min-h-11">
              Cancelar
            </Button>
            <Button onClick={() => upsert.mutate(form)} disabled={upsert.isPending} className="min-h-11">
              {upsert.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de confirmação */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "delete-mapping" && `Remover "${confirm.name}"?`}
              {confirm?.kind === "bulk-silence" && `Silenciar ${confirm.count} canais?`}
              {confirm?.kind === "merge" && `Mesclar "${confirm.sourceName}" em "${confirm.targetName}"?`}
              {confirm?.kind === "bulk-autolink" &&
                `Vincular ${confirm.pairs.length} canal${confirm.pairs.length > 1 ? "is" : ""} como alias?`}
              {confirm?.kind === "undo-autolink" &&
                `Desfazer vínculo de ${confirm.inserted} canal${confirm.inserted > 1 ? "is" : ""}?`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {confirm?.kind === "delete-mapping" && (
                  <p>O canal voltará a usar a logo padrão (built-in) ou o emoji genérico se não houver fallback.</p>
                )}
                {confirm?.kind === "bulk-silence" && (
                  <p>Cria um mapeamento sem logo para cada canal detectado, removendo o alerta amarelo. Você pode editar depois.</p>
                )}
                {confirm?.kind === "merge" && (
                  <p>
                    Os apelidos de <b>{confirm.sourceName}</b> passam para <b>{confirm.targetName}</b>, os jogos publicados
                    com o nome antigo são corrigidos e o cadastro duplicado é removido. Esta ação não pode ser desfeita.
                  </p>
                )}
                {confirm?.kind === "bulk-autolink" && (
                  <>
                    <p>Cada canal abaixo passará a usar a mesma logo do canal principal.</p>
                    <ul className="max-h-56 overflow-y-auto rounded border border-border/40 bg-card/30 p-2 text-xs space-y-1">
                      {confirm.pairs.map((p) => (
                        <li key={p.orphan.normalized} className="flex items-center justify-between gap-2">
                          <span className="truncate">{p.orphan.name}</span>
                          <span className="shrink-0 flex items-center gap-1.5">
                            <span
                              className={
                                p.suggestion.confidence === "high"
                                  ? "text-[10px] uppercase font-bold text-emerald-400"
                                  : "text-[10px] uppercase font-bold text-amber-400"
                              }
                            >
                              {p.suggestion.confidence === "high" ? "alta" : "média"}
                            </span>
                            <span className="text-muted-foreground truncate max-w-[40vw]">
                              → {p.suggestion.target.displayName}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    {confirm.pairs.some((p) => p.suggestion.confidence === "medium") && (
                      <p className="text-[11px] text-amber-300/90">
                        ⚠ Alguns vínculos têm confiança <strong>média</strong>. Revise antes de confirmar — você pode desfazer com 1 clique no toast.
                      </p>
                    )}
                  </>
                )}
                {confirm?.kind === "undo-autolink" && (
                  <>
                    <p>
                      Isso removerá <strong>{confirm.aliasIds.length}</strong>{" "}
                      alias{confirm.aliasIds.length === 1 ? "" : "es"}
                      {confirm.createdMappingIds.length > 0 && (
                        <>
                          {" "}e <strong>{confirm.createdMappingIds.length}</strong> mapeamento
                          {confirm.createdMappingIds.length === 1 ? "" : "s"} criado
                          {confirm.createdMappingIds.length === 1 ? "" : "s"} automaticamente
                        </>
                      )}
                      .
                    </p>
                    <p className="text-[11px] text-amber-300/90">
                      ⚠ Esta ação não pode ser revertida.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <AlertDialogCancel className="min-h-11 mt-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={
                "min-h-11 " +
                (confirm?.kind === "delete-mapping" || confirm?.kind === "undo-autolink"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "")
              }
              onClick={() => {
                if (confirm?.kind === "delete-mapping") {
                  remove.mutate(confirm.id);
                  if (open) setOpen(false);
                } else if (confirm?.kind === "bulk-silence") {
                  bulkSilence.mutate(discovered.orphans);
                } else if (confirm?.kind === "merge") {
                  mergeInto.mutate({ sourceId: confirm.sourceId, targetId: confirm.targetId });
                } else if (confirm?.kind === "bulk-autolink") {
                  linkAsAlias.mutate(confirm.pairs);
                } else if (confirm?.kind === "undo-autolink") {
                  void undoAutolink(confirm.aliasIds, confirm.createdMappingIds);
                }
                setConfirm(null);
              }}
            >
              {confirm?.kind === "undo-autolink" ? "Desfazer" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const StatCard = ({
  icon,
  label,
  value,
  highlight,
  onClick,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
  onClick?: () => void;
  sub?: string;
}) => {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition ${
        highlight
          ? "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15"
          : "border-border/50 bg-card/40 hover:bg-card/60"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
      {sub && <div className="text-[10px] text-emerald-300 mt-0.5">↳ {sub}</div>}
    </Comp>
  );
};

const ChannelCard = ({
  channel,
  suggestion,
  onEdit,
  onDelete,
  onPreview,
  onLinkAlias,
}: {
  channel: DiscoveredChannel;
  suggestion?: ChannelMatchSuggestion;
  onEdit: () => void;
  onDelete: () => void;
  onPreview?: () => void;
  onLinkAlias?: () => void;
}) => {
  const m = channel.mapping;
  const tag = channel.isOrphan
    ? {
        label:
          channel.orphanReason === "logo-none"
            ? 'Mapeado como "sem logo"'
            : "Sem mapeamento",
        cls: "bg-amber-500/20 text-amber-200",
      }
    : m
    ? { label: "Personalizado", cls: "bg-emerald-500/20 text-emerald-200" }
    : channel.isBuiltin
    ? { label: "Built-in", cls: "bg-sky-500/20 text-sky-200" }
    : { label: "—", cls: "bg-muted/40 text-muted-foreground" };

  const confColor: Record<string, string> = {
    high: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
    medium: "border-sky-500/40 bg-sky-500/10 text-sky-100",
    low: "border-muted-foreground/30 bg-muted/30 text-muted-foreground",
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card/40 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tag.cls}`}>
              {tag.label}
            </span>
            {channel.count > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {channel.count} jogo{channel.count > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="mt-1 font-semibold truncate text-sm">{channel.name}</div>
          {m && !m.active && (
            <div className="text-[10px] text-amber-300">Inativo</div>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {onPreview && (
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={onPreview} aria-label="Visualizar">
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-9 w-9" onClick={onEdit} aria-label="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          {m && (
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-destructive hover:text-destructive"
              onClick={onDelete}
              aria-label="Remover canal"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <ChannelBadge name={channel.name} size="md" />
      {channel.isOrphan && suggestion && onLinkAlias && (
        <div className={`rounded-md border px-2 py-1.5 text-[11px] ${confColor[suggestion.confidence]}`}>
          <div className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {suggestion.confidence === "high" ? "Provavelmente " : "Talvez "}
              {suggestion.reason}
            </span>
          </div>
          <Button
            size="sm"
            onClick={onLinkAlias}
            className="w-full gap-1 mt-1.5 h-8 text-xs bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
          >
            <Link2 className="h-3 w-3" /> Vincular como alias
          </Button>
        </div>
      )}
      {channel.isOrphan && (
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          className="w-full gap-1 mt-1 h-9 text-xs"
        >
          <Plus className="h-3 w-3" /> {suggestion ? "Cadastrar como canal novo" : "Adicionar logo"}
        </Button>
      )}
    </div>
  );
};

const SortableChannelRow = ({
  id,
  channel,
  aliases = [],
  conflict = false,
  onEdit,
  onDelete,
  onPreview,
}: {
  id: string;
  channel: DiscoveredChannel;
  aliases?: string[];
  conflict?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const m = channel.mapping;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/40 p-2 sm:p-3"
    >
      <button
        type="button"
        className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-3 -m-2"
        aria-label="Arrastar para reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <ChannelBadge name={channel.name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm truncate flex items-center gap-1.5">
          {m?.primary_color && (
            <span
              className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white/20 shrink-0"
              style={{ backgroundColor: m.primary_color }}
              aria-label={`Cor ${m.primary_color}`}
            />
          )}
          <span className="truncate">{channel.name}</span>
        </div>
        <div className="text-[10px] text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5">
          {m?.channel_type && (
            <span>{CHANNEL_TYPES.find((t) => t.value === m.channel_type)?.label ?? m.channel_type}</span>
          )}
          {channel.count > 0 && <span>{channel.count} jogo{channel.count > 1 ? "s" : ""}</span>}
          {aliases.length > 0 && (
            <span className="truncate max-w-[220px]" title={aliases.join(", ")}>
              {aliases.length} apelido{aliases.length > 1 ? "s" : ""}: {aliases.join(", ")}
            </span>
          )}
          {m && !mappingHasLogo(m) && <span className="text-amber-300">Sem logo</span>}
          {conflict && <span className="text-rose-300 font-semibold">Apelido em conflito</span>}
          {m && !m.active && <span className="text-amber-300">Inativo</span>}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={onPreview} aria-label="Visualizar">
          <Eye className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={onEdit} aria-label="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-destructive hover:text-destructive"
          onClick={onDelete}
          aria-label="Remover canal"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default AdminCanaisLogos;
