import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart3, RefreshCw, Trash2, Users, MousePointerClick, CalendarIcon,
  GitCompareArrows, ArrowUp, ArrowDown, Minus, Send, Target, MousePointer2,
  TrendingUp, Download, AlertTriangle, ShieldAlert, ChevronRight, Activity,
} from "lucide-react";
import { readEventsLog, clearEventsLog } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  Legend, ReferenceLine,
} from "recharts";

const ROW_LIMIT = 5000;

interface RemoteEvent {
  event: string;
  user_id: string | null;
  session_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  tab: string | null;
  surface: string | null;
  props: Record<string, unknown> | null;
  created_at: string;
}

interface CampaignRow {
  campaign: string;
  total: number;
  visitors: number;
  sessions: number;
  byTab: Map<string, number>;
}

interface TabRow {
  tab: string;
  total: number;
  fromShare: number;
  visitors: number;
}

interface Aggregate {
  campaigns: CampaignRow[];
  tabs: TabRow[];
  totals: { events: number; visitors: number; sessions: number };
}

interface FunnelRow {
  campaign: string;
  shares: number;
  landings: number;
  tabViews: number;
  uniqueLanders: number;
  ctr: number;
  conversion: number;
}

interface DailyPoint {
  day: string;
  label: string;
  shares: number;
  landings: number;
  uniqueLanders: number;
  tabViews: number;
  ctr: number | null;
  conversion: number | null;
}

interface TabFunnelRow {
  tab: string;
  shares: number;
  landings: number;
  uniqueLanders: number;
  tabViews: number;
  ctr: number;
  conversion: number;
}

interface ContentClickRow {
  key: string;
  surface: string;
  content_type: string;
  content_title: string;
  clicks: number;
}

interface TrackingHealth {
  sharesNoTab: number;
  landingsNoCampaign: number;
  tabViewsNoTab: number;
  total: number;
}

const PRESETS: { label: string; days: number }[] = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

function startOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(23, 59, 59, 999); return x;
}
function fmtRange(from: Date, to: Date): string {
  return `${format(from, "dd/MM", { locale: ptBR })} – ${format(to, "dd/MM", { locale: ptBR })}`;
}
// YYYY-MM-DD in America/Sao_Paulo (UTC-3, no DST)
function spDayKey(d: Date): string {
  const sp = new Date(d.getTime() - 3 * 3600 * 1000);
  return sp.toISOString().slice(0, 10);
}

function aggregateRemote(events: RemoteEvent[]): Aggregate {
  const campaignMap = new Map<string, CampaignRow>();
  const tabMap = new Map<string, TabRow>();
  const allVisitors = new Set<string>();
  const allSessions = new Set<string>();
  const cV = new Map<string, Set<string>>();
  const cS = new Map<string, Set<string>>();
  const tV = new Map<string, Set<string>>();

  for (const ev of events) {
    const userId = ev.user_id || "anon";
    const sessionId = ev.session_id || "?";
    allVisitors.add(userId);
    allSessions.add(sessionId);

    if (ev.event === "landing_with_utm" || ev.event === "tab_view" || ev.event === "content_card_click") {
      const campaign = ev.utm_campaign || "(direct)";
      const row = campaignMap.get(campaign) ?? { campaign, total: 0, visitors: 0, sessions: 0, byTab: new Map() };
      row.total += 1;
      const tab = ev.tab || (ev.props?.landing_tab as string) || (ev.props?.tab as string) || "—";
      row.byTab.set(tab, (row.byTab.get(tab) ?? 0) + 1);
      campaignMap.set(campaign, row);
      if (!cV.has(campaign)) cV.set(campaign, new Set());
      if (!cS.has(campaign)) cS.set(campaign, new Set());
      cV.get(campaign)!.add(userId);
      cS.get(campaign)!.add(sessionId);
    }
    if (ev.event === "tab_view") {
      const tab = ev.tab || (ev.props?.tab as string) || "—";
      const row = tabMap.get(tab) ?? { tab, total: 0, fromShare: 0, visitors: 0 };
      row.total += 1;
      if (ev.props?.from_share) row.fromShare += 1;
      tabMap.set(tab, row);
      if (!tV.has(tab)) tV.set(tab, new Set());
      tV.get(tab)!.add(userId);
    }
  }
  for (const [c, row] of campaignMap) {
    row.visitors = cV.get(c)?.size ?? 0;
    row.sessions = cS.get(c)?.size ?? 0;
  }
  for (const [t, row] of tabMap) row.visitors = tV.get(t)?.size ?? 0;

  return {
    campaigns: Array.from(campaignMap.values()).sort((a, b) => b.total - a.total),
    tabs: Array.from(tabMap.values()).sort((a, b) => b.total - a.total),
    totals: { events: events.length, visitors: allVisitors.size, sessions: allSessions.size },
  };
}

/**
 * Razão limitada a 100%. Um único "share" pode gerar vários acessos (grupos,
 * encaminhamentos), então CTR/Conversão acima de 100% confundem mais do que ajudam.
 */
const cappedRatio = (num: number, den: number): number => (den > 0 ? Math.min(1, num / den) : 0);

function computeFunnel(remote: RemoteEvent[]): FunnelRow[] {
  const map = new Map<string, { shares: number; landings: number; tabViews: number; landers: Set<string> }>();
  const ensure = (c: string) => {
    if (!map.has(c)) map.set(c, { shares: 0, landings: 0, tabViews: 0, landers: new Set() });
    return map.get(c)!;
  };
  for (const ev of remote) {
    const campaign = ev.utm_campaign || (ev.event === "link_share" ? null : "(direct)");
    if (ev.event === "link_share") {
      const tabSlug = (ev.props?.tab_slug as string) || (ev.tab as string) || null;
      const inferred = ev.utm_campaign || (tabSlug ? `share-${tabSlug}` : null);
      if (!inferred) continue;
      ensure(inferred).shares += 1;
    } else if (ev.event === "landing_with_utm" && campaign) {
      const row = ensure(campaign);
      row.landings += 1;
      if (ev.user_id) row.landers.add(ev.user_id);
    } else if (ev.event === "tab_view" && campaign && campaign !== "(direct)") {
      ensure(campaign).tabViews += 1;
    }
  }
  const rows: FunnelRow[] = [];
  for (const [campaign, v] of map) {
    const uniqueLanders = v.landers.size;
    rows.push({
      campaign, shares: v.shares, landings: v.landings, tabViews: v.tabViews, uniqueLanders,
      ctr: cappedRatio(uniqueLanders > 0 ? uniqueLanders : v.landings, v.shares),
      conversion: cappedRatio(v.tabViews, v.landings),
    });
  }
  return rows.sort((a, b) => b.shares + b.landings - (a.shares + a.landings));
}

function computeDaily(
  remote: RemoteEvent[], from: Date, to: Date, campaign: string | null,
): DailyPoint[] {
  const buckets = new Map<string, { shares: number; landings: number; tabViews: number; landers: Set<string> }>();
  const ensure = (k: string) => {
    if (!buckets.has(k)) buckets.set(k, { shares: 0, landings: 0, tabViews: 0, landers: new Set() });
    return buckets.get(k)!;
  };
  const endKey = spDayKey(to);
  const cursor = new Date(from);
  cursor.setHours(12, 0, 0, 0);
  let safety = 0;
  while (safety++ < 400) {
    const k = spDayKey(cursor);
    ensure(k);
    if (k >= endKey) break;
    cursor.setDate(cursor.getDate() + 1);
  }
  ensure(endKey);

  for (const ev of remote) {
    const key = spDayKey(new Date(ev.created_at));
    const bucket = ensure(key);
    if (ev.event === "link_share") {
      const tabSlug = (ev.props?.tab_slug as string) || (ev.tab as string) || null;
      const inferred = ev.utm_campaign || (tabSlug ? `share-${tabSlug}` : null);
      if (!inferred) continue;
      if (campaign && inferred !== campaign) continue;
      bucket.shares += 1;
    } else if (ev.event === "landing_with_utm") {
      if (campaign && ev.utm_campaign !== campaign) continue;
      bucket.landings += 1;
      if (ev.user_id) bucket.landers.add(ev.user_id);
    } else if (ev.event === "tab_view" && ev.utm_campaign) {
      if (campaign && ev.utm_campaign !== campaign) continue;
      bucket.tabViews += 1;
    }
  }
  return Array.from(buckets.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, v]) => {
      const [, m, d] = day.split("-");
      return {
        day, label: `${d}/${m}`,
        shares: v.shares, landings: v.landings,
        uniqueLanders: v.landers.size, tabViews: v.tabViews,
        ctr: v.shares > 0 ? cappedRatio(v.landers.size > 0 ? v.landers.size : v.landings, v.shares) * 100 : null,
        conversion: v.landings > 0 ? cappedRatio(v.tabViews, v.landings) * 100 : null,
      };
    });
}

function computeFunnelByTab(remote: RemoteEvent[]): TabFunnelRow[] {
  const map = new Map<string, { shares: number; landings: number; tabViews: number; landers: Set<string> }>();
  const ensure = (t: string) => {
    if (!map.has(t)) map.set(t, { shares: 0, landings: 0, tabViews: 0, landers: new Set() });
    return map.get(t)!;
  };
  for (const ev of remote) {
    if (ev.event === "link_share") {
      const tab = (ev.props?.tab_slug as string) || ev.tab || (ev.props?.tab as string) || null;
      if (!tab) continue;
      ensure(tab).shares += 1;
    } else if (ev.event === "landing_with_utm") {
      const tab = (ev.props?.tab_slug as string) || (ev.props?.landing_tab as string) || ev.tab || null;
      if (!tab) continue;
      const row = ensure(tab);
      row.landings += 1;
      if (ev.user_id) row.landers.add(ev.user_id);
    } else if (ev.event === "tab_view") {
      const tab = ev.tab || (ev.props?.tab as string) || null;
      if (!tab) continue;
      ensure(tab).tabViews += 1;
    }
  }
  const rows: TabFunnelRow[] = [];
  for (const [tab, v] of map) {
    rows.push({
      tab, shares: v.shares, landings: v.landings, uniqueLanders: v.landers.size, tabViews: v.tabViews,
      ctr: cappedRatio(v.landers.size > 0 ? v.landers.size : v.landings, v.shares) * 100,
      conversion: cappedRatio(v.tabViews, v.landings) * 100,
    });
  }
  return rows.sort((a, b) => b.shares + b.landings - (a.shares + a.landings));
}

function computeContentClicks(remote: RemoteEvent[]): ContentClickRow[] {
  const map = new Map<string, ContentClickRow>();
  for (const ev of remote) {
    if (ev.event !== "content_card_click") continue;
    const surface = (ev.surface as string) || (ev.props?.surface as string) || "—";
    const ctype = (ev.props?.content_type as string) || "—";
    const title = (ev.props?.content_title as string) || (ev.props?.content_id as string) || "—";
    const key = `${surface}::${ctype}::${title}`;
    const row = map.get(key) ?? { key, surface, content_type: ctype, content_title: title, clicks: 0 };
    row.clicks += 1;
    map.set(key, row);
  }
  return Array.from(map.values()).sort((a, b) => b.clicks - a.clicks).slice(0, 20);
}

function computeHealth(remote: RemoteEvent[]): TrackingHealth {
  let sharesNoTab = 0, landingsNoCampaign = 0, tabViewsNoTab = 0;
  for (const ev of remote) {
    if (ev.event === "link_share") {
      const tabSlug = (ev.props?.tab_slug as string) || ev.tab;
      if (!tabSlug && !ev.utm_campaign) sharesNoTab += 1;
    } else if (ev.event === "landing_with_utm") {
      if (!ev.utm_campaign) landingsNoCampaign += 1;
    } else if (ev.event === "tab_view") {
      if (!ev.tab && !ev.props?.tab) tabViewsNoTab += 1;
    }
  }
  return { sharesNoTab, landingsNoCampaign, tabViewsNoTab, total: remote.length };
}

function toCsv(rows: RemoteEvent[]): string {
  const headers = [
    "created_at", "event", "user_id", "session_id", "utm_source", "utm_medium",
    "utm_campaign", "utm_content", "utm_term", "tab", "surface", "props",
  ];
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => esc((r as unknown as Record<string, unknown>)[h])).join(","));
  }
  return lines.join("\n");
}

function timeAgo(ms: number | null): string {
  if (!ms) return "—";
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 5) return "agora";
  if (sec < 60) return `há ${sec}s`;
  if (sec < 3600) return `há ${Math.floor(sec / 60)}min`;
  return `há ${Math.floor(sec / 3600)}h`;
}

export default function AdminAnalytics() {
  const [remote, setRemote] = useState<RemoteEvent[]>([]);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [lastFetch, setLastFetch] = useState<number | null>(null);
  const [hitLimit, setHitLimit] = useState(false);
  const [, forceTick] = useState(0);

  const [fromA, setFromA] = useState<Date>(() => startOfDay(new Date(Date.now() - 6 * 86400000)));
  const [toA, setToA] = useState<Date>(() => endOfDay(new Date()));
  const [compareOn, setCompareOn] = useState(false);
  const [fromB, setFromB] = useState<Date>(() => startOfDay(new Date(Date.now() - 13 * 86400000)));
  const [toB, setToB] = useState<Date>(() => endOfDay(new Date(Date.now() - 7 * 86400000)));
  const [activePreset, setActivePreset] = useState<number | null>(7);

  // Keep "há Xmin" indicator fresh.
  useEffect(() => {
    const id = setInterval(() => forceTick((x) => x + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const applyPreset = (days: number) => {
    const to = endOfDay(new Date());
    const from = startOfDay(new Date(Date.now() - (days - 1) * 86400000));
    setFromA(from); setToA(to);
    setActivePreset(days);
    if (compareOn) {
      setToB(endOfDay(new Date(from.getTime() - 86400000)));
      setFromB(startOfDay(new Date(from.getTime() - days * 86400000)));
    }
  };

  const fetchRemote = async () => {
    const lo = compareOn ? Math.min(fromA.getTime(), fromB.getTime()) : fromA.getTime();
    const hi = compareOn ? Math.max(toA.getTime(), toB.getTime()) : toA.getTime();
    setLoadingRemote(true);
    try {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event,user_id,session_id,utm_source,utm_medium,utm_campaign,utm_content,utm_term,tab,surface,props,created_at")
        .gte("created_at", new Date(lo).toISOString())
        .lte("created_at", new Date(hi).toISOString())
        .order("created_at", { ascending: false })
        .limit(ROW_LIMIT);
      if (error) {
        toast.error("Falha ao carregar analytics");
      } else if (data) {
        setRemote(data as unknown as RemoteEvent[]);
        setHitLimit(data.length >= ROW_LIMIT);
        setLastFetch(Date.now());
      }
    } finally {
      setLoadingRemote(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await fetchRemote();
      if (cancelled) setRemote([]);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromA, toA, fromB, toB, compareOn]);

  const inWin = (ts: number, from: Date, to: Date) => ts >= from.getTime() && ts <= to.getTime();
  const remoteA = useMemo(
    () => remote.filter((e) => inWin(new Date(e.created_at).getTime(), fromA, toA)),
    [remote, fromA, toA],
  );
  const remoteB = useMemo(
    () => (compareOn ? remote.filter((e) => inWin(new Date(e.created_at).getTime(), fromB, toB)) : []),
    [remote, fromB, toB, compareOn],
  );

  const aggA = useMemo(() => aggregateRemote(remoteA), [remoteA]);
  const aggB = useMemo(() => (compareOn ? aggregateRemote(remoteB) : null), [remoteB, compareOn]);

  const funnelA = useMemo(() => computeFunnel(remoteA), [remoteA]);
  const funnelB = useMemo(() => computeFunnel(remoteB), [remoteB]);

  const [selectedCampaign, setSelectedCampaign] = useState<string>("__all__");
  const campaignOptions = useMemo(() => {
    const set = new Set<string>();
    funnelA.forEach((r) => set.add(r.campaign));
    funnelB.forEach((r) => set.add(r.campaign));
    return Array.from(set).sort();
  }, [funnelA, funnelB]);
  const dailyCampaign = selectedCampaign === "__all__" ? null : selectedCampaign;
  const dailyA = useMemo(() => computeDaily(remoteA, fromA, toA, dailyCampaign), [remoteA, fromA, toA, dailyCampaign]);
  const dailyB = useMemo(
    () => (compareOn ? computeDaily(remoteB, fromB, toB, dailyCampaign) : []),
    [remoteB, fromB, toB, compareOn, dailyCampaign],
  );
  const dailyChart = useMemo(() => dailyA.map((p, i) => ({
    label: p.label,
    ctrA: p.ctr, convA: p.conversion,
    ctrB: dailyB[i]?.ctr ?? null, convB: dailyB[i]?.conversion ?? null,
    sharesA: p.shares, landingsA: p.landings, tabViewsA: p.tabViews,
    sharesB: dailyB[i]?.shares ?? 0,
  })), [dailyA, dailyB]);
  const shareDays = useMemo(() => dailyA.filter((p) => p.shares > 0).map((p) => p.label), [dailyA]);

  const tabFunnelA = useMemo(() => computeFunnelByTab(remoteA), [remoteA]);
  const tabFunnelB = useMemo(() => computeFunnelByTab(remoteB), [remoteB]);
  const contentClicks = useMemo(() => computeContentClicks(remoteA), [remoteA]);
  const health = useMemo(() => computeHealth(remoteA), [remoteA]);

  const handleClearLocal = () => {
    clearEventsLog();
    toast.success("Log local apagado");
  };

  const handleExportCsv = () => {
    if (remoteA.length === 0) {
      toast.error("Sem dados para exportar no período A");
      return;
    }
    const csv = toCsv(remoteA);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_${spDayKey(fromA)}_${spDayKey(toA)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exportado: ${remoteA.length} eventos`);
  };

  const localCount = readEventsLog().length;

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-5xl mx-auto pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl tracking-wide text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary shrink-0" /> Analytics UTM
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-body">
            Dados do banco · {fmtRange(fromA, toA)} · atualizado {timeAgo(lastFetch)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline" size="sm"
            onClick={() => void fetchRemote()}
            disabled={loadingRemote}
            className="min-h-11"
            aria-label="Atualizar dados"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loadingRemote && "animate-spin")} /> Atualizar
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={handleExportCsv}
            disabled={remoteA.length === 0}
            className="min-h-11"
            aria-label="Exportar CSV do período A"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="min-h-11" aria-label="Limpar log local">
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Limpar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar registro local de depuração?</AlertDialogTitle>
                <AlertDialogDescription>
                  Apaga apenas os {localCount} eventos guardados neste navegador (localStorage).
                  O histórico do banco não é afetado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearLocal}>Limpar registro</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {hitLimit && (
        <Card className="p-3 border-warning/50 bg-warning/5 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs font-body text-foreground">
            Limite de {ROW_LIMIT.toLocaleString("pt-BR")} eventos atingido. Encurte o período para ver dados completos.
          </p>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-body mr-1">Atalhos:</span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.days)}
              aria-pressed={activePreset === p.days}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-colors min-h-11",
                activePreset === p.days
                  ? "bg-primary/15 border-primary/50 text-primary"
                  : "bg-surface border-border text-muted-foreground hover:text-foreground hover:border-primary/30",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PeriodPicker label="Período A" from={fromA} to={toA} setFrom={(d) => { setFromA(d); setActivePreset(null); }} setTo={(d) => { setToA(d); setActivePreset(null); }} accent="primary" />
          <div className={cn("transition-opacity", !compareOn && "opacity-40 pointer-events-none")}>
            <PeriodPicker label="Período B (comparação)" from={fromB} to={toB} setFrom={setFromB} setTo={setToB} accent="muted" />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1 border-t border-border/40">
          <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
          <label htmlFor="cmp" className="text-xs font-body text-foreground cursor-pointer flex-1">
            Comparar dois períodos
          </label>
          <Switch id="cmp" checked={compareOn} onCheckedChange={setCompareOn} />
        </div>
      </Card>

      {/* Totals */}
      {loadingRemote && remote.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-4 h-[72px] skeleton-shimmer rounded-md" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard icon={MousePointerClick} label="Eventos" value={aggA.totals.events} compare={aggB?.totals.events} />
          <StatCard icon={Users} label="Visitantes únicos" value={aggA.totals.visitors} compare={aggB?.totals.visitors} />
          <StatCard icon={Users} label="Sessões" value={aggA.totals.sessions} compare={aggB?.totals.sessions} />
        </div>
      )}

      {/* Tracking health */}
      {(health.sharesNoTab + health.landingsNoCampaign + health.tabViewsNoTab) > 0 && (
        <Card className="p-4 space-y-2 border-warning/30">
          <h2 className="font-display text-lg tracking-wide text-foreground flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-warning" /> Saúde do tracking
          </h2>
          <p className="text-[10px] text-muted-foreground font-body">
            Eventos com metadata faltando — corrija os geradores de link para uma análise precisa.
          </p>
          <ul className="text-xs font-body space-y-1">
            {health.sharesNoTab > 0 && (
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Shares sem tab/campaign</span>
                <span className="text-warning font-bold tabular-nums">{health.sharesNoTab}</span>
              </li>
            )}
            {health.landingsNoCampaign > 0 && (
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Landings sem utm_campaign</span>
                <span className="text-warning font-bold tabular-nums">{health.landingsNoCampaign}</span>
              </li>
            )}
            {health.tabViewsNoTab > 0 && (
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Visualizações de aba sem nome da aba</span>
                <span className="text-warning font-bold tabular-nums">{health.tabViewsNoTab}</span>
              </li>
            )}
          </ul>
        </Card>
      )}

      {/* Funil WhatsApp */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl tracking-wide text-foreground">
            Funil <span className="text-primary">WhatsApp</span>
          </h2>
          {loadingRemote && <span className="text-[10px] text-muted-foreground font-body">carregando…</span>}
        </div>
        <p className="text-[10px] text-muted-foreground font-body">
          Taxa de clique (CTR) = pessoas que abriram o link ÷ compartilhamentos · Conversão = quem navegou nas abas ÷ quem abriu (ambos limitados a 100%)
        </p>
        {funnelA.length === 0 ? (
          <p className="text-xs text-muted-foreground italic font-body">
            Nenhum compartilhamento ou acesso registrado ainda. Envie uma mensagem pronta pela aba WhatsApp para começar.
          </p>
        ) : (
          <>
            {/* Mobile: cards empilhados (sem rolagem horizontal) */}
            <ul className="space-y-2 sm:hidden">
              {funnelA.map((r) => {
                const b = funnelB.find((x) => x.campaign === r.campaign);
                return (
                  <li
                    key={r.campaign}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 font-body"
                  >
                    <p className="break-all font-mono text-[11px] font-bold text-foreground">{r.campaign}</p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                      <div>
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          <Send className="mr-1 inline h-3 w-3" />Shares
                        </dt>
                        <dd className="text-sm tabular-nums text-foreground">
                          {r.shares}{compareOn && <Delta a={r.shares} b={b?.shares ?? 0} />}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          <MousePointer2 className="mr-1 inline h-3 w-3" />Landings
                        </dt>
                        <dd className="text-sm tabular-nums text-foreground">
                          {r.landings}{compareOn && <Delta a={r.landings} b={b?.landings ?? 0} />}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Taxa de clique (CTR)</dt>
                        <dd className="text-sm font-bold tabular-nums text-primary">{(r.ctr * 100).toFixed(1)}%</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Tab views</dt>
                        <dd className="text-sm tabular-nums text-foreground">{r.tabViews}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          <Target className="mr-1 inline h-3 w-3" />Conversão
                        </dt>
                        <dd className="text-sm font-bold tabular-nums text-primary">{(r.conversion * 100).toFixed(0)}%</dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>

            {/* Desktop: tabela completa */}
            <div className="hidden sm:block">
              <ScrollHint>
                <table className="w-full text-xs font-body min-w-[480px]">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-2 pr-3 sticky left-0 bg-card">Campaign</th>
                      <th className="py-2 px-3 text-right"><Send className="inline h-3 w-3" /> Compartilhamentos</th>
                      <th className="py-2 px-3 text-right"><MousePointer2 className="inline h-3 w-3" /> Acessos ao link</th>
                      <th className="py-2 px-3 text-right" title="Taxa de clique">Taxa de clique (CTR)</th>
                      <th className="py-2 px-3 text-right">Visualizações de aba</th>
                      <th className="py-2 pl-3 text-right"><Target className="inline h-3 w-3" /> Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {funnelA.map((r) => {
                      const b = funnelB.find((x) => x.campaign === r.campaign);
                      return (
                        <tr key={r.campaign} className="border-b border-border/30">
                          <td className="py-2 pr-3 font-mono text-[11px] text-foreground sticky left-0 bg-card">{r.campaign}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{r.shares}{compareOn && <Delta a={r.shares} b={b?.shares ?? 0} />}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{r.landings}{compareOn && <Delta a={r.landings} b={b?.landings ?? 0} />}</td>
                          <td className="py-2 px-3 text-right tabular-nums text-primary font-bold">{(r.ctr * 100).toFixed(1)}%</td>
                          <td className="py-2 px-3 text-right tabular-nums">{r.tabViews}</td>
                          <td className="py-2 pl-3 text-right tabular-nums text-primary font-bold">{(r.conversion * 100).toFixed(0)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollHint>
            </div>
          </>

        )}
      </Card>

      {/* Daily chart */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl tracking-wide text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Tendência diária
          </h2>
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="bg-surface border border-border rounded-md text-xs font-body text-foreground px-3 py-2 min-h-11 focus:outline-none focus:border-primary/50"
            aria-label="Filtrar por campanha"
          >
            <option value="__all__">Todas as campanhas</option>
            {campaignOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <p className="text-[10px] text-muted-foreground font-body">
          Taxa de clique (aberturas ÷ compartilhamentos) e Conversão (navegação ÷ aberturas) por dia, limitados a 100%. Linhas verticais marcam dias em que houve compartilhamento.
        </p>
        {dailyChart.every((p) => p.ctrA === null && p.convA === null) ? (
          <p className="text-xs text-muted-foreground italic font-body py-8 text-center">
            Sem dados suficientes neste período. Compartilhe um link e aguarde os primeiros acessos.
          </p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyChart} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} tickMargin={6} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, (dataMax: number) => Math.max(100, Math.ceil(dataMax / 25) * 25)]}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8, fontSize: 11,
                  }}
                  formatter={(value: number | null, name: string) => [value === null ? "—" : `${value.toFixed(1)}%`, name]}
                  labelFormatter={(label, payload) => {
                    const p = payload?.[0]?.payload as typeof dailyChart[number] | undefined;
                    if (!p) return label;
                    return `${label} · ${p.sharesA} shares · ${p.landingsA} landings · ${p.tabViewsA} views`;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} iconType="line" />
                {shareDays.map((day) => (
                  <ReferenceLine key={day} x={day} stroke="hsl(var(--primary))" strokeDasharray="2 4" strokeOpacity={0.4} />
                ))}
                <Line type="monotone" dataKey="ctrA" name="Taxa de clique" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} connectNulls isAnimationActive={false} />
                <Line type="monotone" dataKey="convA" name="Conversão" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 2 }} connectNulls isAnimationActive={false} />
                {compareOn && <Line type="monotone" dataKey="ctrB" name="Taxa de clique (B)" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls isAnimationActive={false} />}
                {compareOn && <Line type="monotone" dataKey="convB" name="Conversão (B)" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="2 2" dot={false} connectNulls isAnimationActive={false} />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Funil por aba */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl tracking-wide text-foreground">
            Funil por <span className="text-primary">aba</span>
          </h2>
          {compareOn && <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">A vs B</span>}
        </div>
        <p className="text-[10px] text-muted-foreground font-body">
          Qual aba converte melhor após o compartilhamento. Taxa de clique = acessos ao link ÷ compartilhamentos · Conversão = visualizações de aba ÷ acessos ao link.
        </p>
        {tabFunnelA.length === 0 ? (
          <p className="text-xs text-muted-foreground italic font-body">Sem dados por aba ainda no período.</p>
        ) : (
          <ScrollHint>
            <table className="w-full text-xs font-body min-w-[520px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 sticky left-0 bg-card">Aba</th>
                  <th className="py-2 px-3 text-right"><Send className="inline h-3 w-3" /> Compartilhamentos</th>
                  <th className="py-2 px-3 text-right"><MousePointer2 className="inline h-3 w-3" /> Acessos ao link</th>
                  <th className="py-2 px-3 text-right" title="Taxa de clique">Taxa de clique (CTR)</th>
                  <th className="py-2 px-3 text-right">Visualizações de aba</th>
                  <th className="py-2 pl-3 text-right"><Target className="inline h-3 w-3" /> Conv.</th>
                </tr>
              </thead>
              <tbody>
                {tabFunnelA.map((r) => {
                  const b = tabFunnelB.find((x) => x.tab === r.tab);
                  const maxViews = Math.max(...tabFunnelA.map((x) => x.tabViews), 1);
                  const pct = (r.tabViews / maxViews) * 100;
                  return (
                    <tr key={r.tab} className="border-b border-border/30">
                      <td className="py-2 pr-3 sticky left-0 bg-card">
                        <div className="font-mono text-[11px] text-foreground">{r.tab}</div>
                        <div className="h-1 mt-1 rounded-full bg-surface overflow-hidden max-w-[120px]">
                          <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{r.shares}{compareOn && <Delta a={r.shares} b={b?.shares ?? 0} />}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{r.landings}{compareOn && <Delta a={r.landings} b={b?.landings ?? 0} />}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-primary font-bold">
                        {r.ctr.toFixed(0)}%{compareOn && <Delta a={Math.round(r.ctr)} b={Math.round(b?.ctr ?? 0)} />}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{r.tabViews}{compareOn && <Delta a={r.tabViews} b={b?.tabViews ?? 0} />}</td>
                      <td className="py-2 pl-3 text-right tabular-nums text-primary font-bold">
                        {r.conversion.toFixed(0)}%{compareOn && <Delta a={Math.round(r.conversion)} b={Math.round(b?.conversion ?? 0)} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollHint>
        )}
      </Card>

      {/* Por utm_campaign */}
      <Card className="p-4 space-y-3">
        <h2 className="font-display text-xl tracking-wide text-foreground">
          Por <span className="text-primary">utm_campaign</span>
          {compareOn && (
            <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground font-body">
              {fmtRange(fromA, toA)} vs {fmtRange(fromB, toB)}
            </span>
          )}
        </h2>
        {aggA.campaigns.length === 0 ? (
          <p className="text-xs text-muted-foreground italic font-body">Sem dados na janela selecionada.</p>
        ) : (
          <ScrollHint>
            <table className="w-full text-xs font-body min-w-[560px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 sticky left-0 bg-card">Campaign</th>
                  <th className="py-2 px-3 text-right">Eventos {compareOn && "(A / B)"}</th>
                  <th className="py-2 px-3 text-right">Visitantes</th>
                  <th className="py-2 px-3 text-right">Sessões</th>
                  <th className="py-2 pl-3">Top abas</th>
                </tr>
              </thead>
              <tbody>
                {aggA.campaigns.map((c) => {
                  const b = aggB?.campaigns.find((x) => x.campaign === c.campaign);
                  return (
                    <tr key={c.campaign} className="border-b border-border/30">
                      <td className="py-2 pr-3 font-mono text-[11px] text-foreground sticky left-0 bg-card">{c.campaign}</td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        <span className="text-primary font-bold">{c.total}</span>
                        {compareOn && (
                          <>
                            <span className="text-muted-foreground"> / {b?.total ?? 0}</span>
                            <Delta a={c.total} b={b?.total ?? 0} />
                          </>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{c.visitors}{compareOn && <Delta a={c.visitors} b={b?.visitors ?? 0} />}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{c.sessions}{compareOn && <Delta a={c.sessions} b={b?.sessions ?? 0} />}</td>
                      <td className="py-2 pl-3 text-muted-foreground">
                        {Array.from(c.byTab.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, n]) => `${t} (${n})`).join(", ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollHint>
        )}
      </Card>

      {/* Tabs */}
      <Card className="p-4 space-y-3">
        <h2 className="font-display text-xl tracking-wide text-foreground">
          Por <span className="text-primary">aba visualizada</span>
        </h2>
        {aggA.tabs.length === 0 ? (
          <p className="text-xs text-muted-foreground italic font-body">Sem visualizações de aba ainda.</p>
        ) : (
          <div className="space-y-2">
            {aggA.tabs.map((t) => {
              const max = aggA.tabs[0].total || 1;
              const pct = (t.total / max) * 100;
              const sharePct = t.total ? (t.fromShare / t.total) * 100 : 0;
              const b = aggB?.tabs.find((x) => x.tab === t.tab);
              return (
                <div key={t.tab} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-body gap-2">
                    <span className="font-bold text-foreground truncate">{t.tab}</span>
                    <span className="text-muted-foreground tabular-nums text-right shrink-0">
                      {t.total} views · {t.visitors} vis · {sharePct.toFixed(0)}% share
                      {compareOn && (
                        <>
                          <span className="mx-1.5">·</span>
                          <span>B: {b?.total ?? 0}</span>
                          <Delta a={t.total} b={b?.total ?? 0} />
                        </>
                      )}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface overflow-hidden flex gap-px">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    {compareOn && b && (
                      <div className="h-full bg-muted-foreground/30 rounded-full" style={{ width: `${(b.total / max) * 100}%` }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Top conteúdo clicado */}
      <Card className="p-4 space-y-3">
        <h2 className="font-display text-xl tracking-wide text-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Top conteúdo clicado
        </h2>
        <p className="text-[10px] text-muted-foreground font-body">
          Cliques em cards atribuídos a sessões com UTM (campanhas WhatsApp). Top 20.
        </p>
        {contentClicks.length === 0 ? (
          <p className="text-xs text-muted-foreground italic font-body">
            Sem cliques atribuídos no período. Eventos só são gerados quando a sessão chega via link UTM.
          </p>
        ) : (
          <ScrollHint>
            <table className="w-full text-xs font-body min-w-[420px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 sticky left-0 bg-card">Conteúdo</th>
                  <th className="py-2 px-3">Surface</th>
                  <th className="py-2 px-3">Tipo</th>
                  <th className="py-2 pl-3 text-right">Cliques</th>
                </tr>
              </thead>
              <tbody>
                {contentClicks.map((r) => (
                  <tr key={r.key} className="border-b border-border/30">
                    <td className="py-2 pr-3 text-foreground sticky left-0 bg-card max-w-[200px] truncate" title={r.content_title}>
                      {r.content_title}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground font-mono text-[10px]">{r.surface}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.content_type}</td>
                    <td className="py-2 pl-3 text-right tabular-nums text-primary font-bold">{r.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollHint>
        )}
      </Card>

      <p className="text-[10px] text-muted-foreground font-body italic">
        Dados servidos diretamente do banco (`analytics_events`). Limite de {ROW_LIMIT.toLocaleString("pt-BR")} eventos por consulta.
        {localCount > 0 && <> · Log local de debug: {localCount} eventos.</>}
      </p>
    </div>
  );
}

const ScrollHint = ({ children }: { children: React.ReactNode }) => (
  <div className="relative -mx-4 sm:mx-0">
    <div className="overflow-x-auto px-4 sm:px-0">{children}</div>
    <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-card to-transparent sm:hidden" aria-hidden />
    <div className="sm:hidden flex items-center justify-end gap-1 mt-1 text-[9px] uppercase tracking-wider text-muted-foreground/70 font-body pr-1">
      deslize <ChevronRight className="h-2.5 w-2.5" />
    </div>
  </div>
);

const PeriodPicker = ({
  label, from, to, setFrom, setTo, accent,
}: {
  label: string; from: Date; to: Date;
  setFrom: (d: Date) => void; setTo: (d: Date) => void;
  accent: "primary" | "muted";
}) => (
  <div className="space-y-1.5">
    <p className={cn("text-[10px] uppercase tracking-wider font-body font-bold", accent === "primary" ? "text-primary" : "text-muted-foreground")}>
      {label}
    </p>
    <div className="flex items-center gap-2">
      <DateButton date={from} onChange={(d) => setFrom(startOfDay(d))} align="start" />
      <span className="text-muted-foreground text-xs">→</span>
      <DateButton date={to} onChange={(d) => setTo(endOfDay(d))} align="end" />
    </div>
  </div>
);

const DateButton = ({ date, onChange, align }: { date: Date; onChange: (d: Date) => void; align: "start" | "end" }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" size="sm" className="flex-1 justify-start text-left font-normal text-xs min-h-11">
        <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
        {format(date, "dd MMM yyyy", { locale: ptBR })}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align={align}>
      <Calendar mode="single" selected={date} onSelect={(d) => d && onChange(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
    </PopoverContent>
  </Popover>
);

const Delta = ({ a, b }: { a: number; b: number }) => {
  if (b === 0 && a === 0) return null;
  const diff = a - b;
  const pct = b === 0 ? 100 : (diff / b) * 100;
  const Icon = diff > 0 ? ArrowUp : diff < 0 ? ArrowDown : Minus;
  const color = diff > 0 ? "text-primary" : diff < 0 ? "text-destructive" : "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-0.5 ml-1 text-[10px] font-bold tabular-nums", color)}>
      <Icon className="h-2.5 w-2.5" />
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
};

const StatCard = ({
  icon: Icon, label, value, compare,
}: {
  icon: typeof Users; label: string; value: number; compare?: number;
}) => (
  <Card className="p-4 flex items-center gap-3">
    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">{label}</p>
      <div className="flex items-baseline gap-2 flex-wrap">
        <p className="font-display text-2xl text-foreground tabular-nums">{value.toLocaleString("pt-BR")}</p>
        {compare !== undefined && (
          <>
            <span className="text-[10px] text-muted-foreground font-body">vs {compare}</span>
            <Delta a={value} b={compare} />
          </>
        )}
      </div>
    </div>
  </Card>
);
