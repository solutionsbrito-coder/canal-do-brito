import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ScrollText, Trash2, ShieldAlert, RefreshCw, Download, Search,
  ChevronDown, ChevronRight, Copy, Activity, AlertCircle, PlayCircle,
  Settings as SettingsIcon, Filter, AlertTriangle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  actor_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type ActionMeta = {
  label: string;
  icon: typeof ScrollText;
  cls: string;
};

const ACTION_META: Record<string, ActionMeta> = {
  delete_manual: { label: "Jogo manual removido", icon: Trash2, cls: "text-amber-300 bg-amber-500/10 border-amber-500/30" },
  delete_api: { label: "Jogo API removido", icon: Trash2, cls: "text-rose-300 bg-rose-500/10 border-rose-500/30" },
  api_sync_run: { label: "Sync API", icon: PlayCircle, cls: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" },
  api_sync_failed: { label: "Sync falhou", icon: AlertCircle, cls: "text-rose-300 bg-rose-500/10 border-rose-500/30" },
  api_live_update_run: { label: "Live update", icon: Activity, cls: "text-cyan-300 bg-cyan-500/10 border-cyan-500/30" },
  api_sync_resumed: { label: "Sync reativado", icon: SettingsIcon, cls: "text-primary bg-primary/10 border-primary/30" },
  api_sync_paused: { label: "Sync pausado", icon: SettingsIcon, cls: "text-amber-300 bg-amber-500/10 border-amber-500/30" },
};

const PRESET_DAYS = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "Tudo", days: 0 },
] as const;

const ROW_LIMIT = 500;

function relTime(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `há ${sec}s`;
  if (sec < 3600) return `há ${Math.floor(sec / 60)}min`;
  if (sec < 86400) return `há ${Math.floor(sec / 3600)}h`;
  return `há ${Math.floor(sec / 86400)}d`;
}

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function rowsToCsv(rows: AuditRow[]): string {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headers = ["created_at", "action", "entity", "actor_id", "payload"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([r.created_at, r.action, r.entity, r.actor_id ?? "", JSON.stringify(r.payload ?? {})].map(esc).join(","));
  }
  return lines.join("\n");
}

const AdminAudit = () => {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [days, setDays] = useState<number>(7);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["audit_logs", days],
    queryFn: async () => {
      let q = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(ROW_LIMIT);
      if (days > 0) {
        q = q.gte("created_at", new Date(Date.now() - days * 86400000).toISOString());
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as AuditRow[];
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 60_000,
  });

  if (error) {
    // surface fetch errors once per render cycle
    console.error("[audit] fetch failed", error);
  }

  const rows = data ?? [];
  const hitLimit = rows.length >= ROW_LIMIT;

  const actionOptions = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.action, (m.get(r.action) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const entityOptions = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.entity, (m.get(r.entity) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      if (entityFilter !== "all" && r.entity !== entityFilter) return false;
      if (q) {
        const blob = `${r.action} ${r.entity} ${r.actor_id ?? ""} ${JSON.stringify(r.payload ?? {})}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, actionFilter, entityFilter, query]);

  const stats = useMemo(() => {
    const acc = { deletes: 0, syncs: 0, fails: 0 };
    filtered.forEach((r) => {
      if (r.action.startsWith("delete_")) acc.deletes += 1;
      else if (r.action === "api_sync_failed") acc.fails += 1;
      else if (r.action.startsWith("api_")) acc.syncs += 1;
    });
    return acc;
  }, [filtered]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyId = (id: string) => {
    void navigator.clipboard.writeText(id);
    toast.success("ID copiado");
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("Sem registros para exportar");
      return;
    }
    const csv = rowsToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} registros exportados`);
  };

  return (
    <div className="space-y-4 max-w-3xl pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      {/* Header */}
      <div className="glass-panel rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground">Trilha de auditoria</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Histórico de remoções de jogos, sincronizações da API e mudanças de configuração.
              </p>
            </div>
          </div>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline" size="sm" className="min-h-11"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Atualizar"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isFetching && "animate-spin")} />
              Atualizar
            </Button>
            <Button
              variant="outline" size="sm" className="min-h-11"
              onClick={handleExport}
              disabled={filtered.length === 0}
              aria-label="Exportar CSV"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatPill label="Remoções" value={stats.deletes} cls="text-amber-300" />
          <StatPill label="Sync runs" value={stats.syncs} cls="text-emerald-300" />
          <StatPill label="Falhas" value={stats.fails} cls="text-rose-300" />
        </div>

        {/* Period presets */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground self-center mr-1">Período:</span>
          {PRESET_DAYS.map((p) => (
            <button
              key={p.label}
              onClick={() => setDays(p.days)}
              aria-pressed={days === p.days}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition min-h-11 font-bold uppercase tracking-wider",
                days === p.days
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-white/[0.04] border-white/10 text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Search + filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por time, detalhes ou usuário…"
              aria-label="Buscar na auditoria"
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 min-h-11 focus:outline-none focus:border-primary/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FilterSelect
              icon={Filter} label="Ação" value={actionFilter} onChange={setActionFilter}
              options={[["all", `Todas (${rows.length})`], ...actionOptions.map(([v, c]) => [v, `${ACTION_META[v]?.label ?? v} (${c})`] as [string, string])]}
            />
            <FilterSelect
              icon={Filter} label="Entidade" value={entityFilter} onChange={setEntityFilter}
              options={[["all", `Todas (${rows.length})`], ...entityOptions.map(([v, c]) => [v, `${v} (${c})`] as [string, string])]}
            />
          </div>
        </div>
      </div>

      {hitLimit && (
        <div className="glass-panel border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">
            Limite de {ROW_LIMIT} eventos atingido. Encurte o período para resultados completos.
          </p>
        </div>
      )}

      {error && (
        <div className="glass-panel border-rose-500/30 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">Falha ao carregar registros. Tente novamente.</p>
        </div>
      )}

      {/* Events list */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">Eventos</h3>
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {filtered.length} de {rows.length}
          </span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {isLoading && (
            <div className="p-3 space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 rounded-md skeleton-shimmer" />
              ))}
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="p-6 text-center space-y-3">
              <ScrollText className="h-8 w-8 text-muted-foreground/20 mx-auto" aria-hidden />
              <p className="text-xs text-muted-foreground">Nenhum evento encontrado nesse período.</p>
              {(rows.length > 0 || days > 0) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-11 text-xs"
                  onClick={() => { setQuery(""); setActionFilter("all"); setEntityFilter("all"); setDays(0); }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          )}
          {!isLoading && filtered.map((row) => {
            const meta = ACTION_META[row.action] ?? {
              label: row.action, icon: ScrollText,
              cls: "text-muted-foreground bg-white/5 border-white/10",
            };
            const Icon = meta.icon;
            const p = (row.payload ?? {}) as Record<string, unknown>;
            const isOpen = expanded.has(row.id);
            return (
              <div key={row.id} className="p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={cn("inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border", meta.cls)}>
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums" title={formatTs(row.created_at)}>
                    {relTime(row.created_at)}
                  </span>
                </div>

                {row.entity === "daily_games" && (p.home_team as string) && (
                  <p className="text-xs text-foreground">
                    <span className="font-semibold">{String(p.home_team)}</span>
                    {p.away_team && p.away_team !== "—" && <> × <span className="font-semibold">{String(p.away_team)}</span></>}
                    <span className="text-muted-foreground">
                      {" "}• {String(p.date ?? "")} {String(p.game_time ?? "").slice(0, 5)} • {String(p.sport_type ?? "")} • src: {String(p.source ?? "")}
                    </span>
                  </p>
                )}
                {row.action === "api_sync_run" && (
                  <p className="text-[11px] text-muted-foreground">
                    {String(p.date ?? "")} • {String(p.sports ?? "?")} esportes •{" "}
                    <span className="text-emerald-300">{String(p.upserted ?? 0)} upsert</span> •{" "}
                    <span className="text-amber-300">{String(p.skipped ?? 0)} skip</span>
                    {Number(p.errors_count) > 0 && <span className="text-rose-300"> • {String(p.errors_count)} erros</span>}
                    {p.triggered_by && <span> • via {String(p.triggered_by)}</span>}
                  </p>
                )}
                {row.action === "api_live_update_run" && (
                  <p className="text-[11px] text-muted-foreground">
                    {String(p.todaysGames ?? 0)} jogos • {String(p.updated ?? 0)} atualizados • {String(p.live_count ?? 0)} ao vivo • {String(p.finished ?? 0)} finalizados
                    {p.triggered_by && <span> • via {String(p.triggered_by)}</span>}
                  </p>
                )}
                {row.action === "api_sync_failed" && (
                  <p className="text-[11px] text-rose-300 break-words">{String(p.error ?? "—")}</p>
                )}
                {row.entity === "settings" && (
                  <p className="text-[11px] text-muted-foreground">
                    {p.previous ? `de "${String(p.previous)}" → "${String(p.new)}"` : `→ "${String(p.new ?? "")}"`}
                    {p.jobs_updated !== undefined && <> • {String(p.jobs_updated)} cron job(s) atualizado(s)</>}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 text-[9px] text-muted-foreground/60 font-mono">
                  <span className="truncate">
                    {row.actor_id ? (
                      <button
                        onClick={() => copyId(row.actor_id!)}
                        className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
                        aria-label="Copiar actor id"
                      >
                        <Copy className="h-2.5 w-2.5" /> usuário: {row.actor_id.slice(0, 8)}
                      </button>
                    ) : (
                      <span>usuário: sistema</span>
                    )}
                  </span>
                  <button
                    onClick={() => toggleExpand(row.id)}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors min-h-11 px-1 -mx-1"
                    aria-expanded={isOpen}
                    aria-label={isOpen ? "Ocultar detalhes técnicos" : "Ver detalhes técnicos"}
                  >
                    {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    Detalhes técnicos
                  </button>
                </div>

                {isOpen && (
                  <pre className="text-[10px] font-mono bg-black/40 border border-white/5 rounded p-2 overflow-x-auto text-muted-foreground whitespace-pre-wrap break-all">
                    {JSON.stringify(row.payload ?? {}, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground italic px-1">
        Dados servidos do banco (`audit_logs`). Atualização automática a cada 30s. Limite de {ROW_LIMIT} eventos.
      </p>
    </div>
  );
};

const StatPill = ({ label, value, cls }: { label: string; value: number; cls: string }) => (
  <div className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2">
    <p className={cn("font-display text-xl tabular-nums leading-none", cls)}>{value}</p>
    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
  </div>
);

const FilterSelect = ({
  icon: Icon, label, value, onChange, options,
}: {
  icon: typeof Filter;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) => (
  <label className="block">
    <span className="sr-only">{label}</span>
    <div className="relative">
      <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-7 pr-2 py-2 text-xs text-foreground min-h-11 focus:outline-none focus:border-primary/40 truncate"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </div>
  </label>
);

export default AdminAudit;
