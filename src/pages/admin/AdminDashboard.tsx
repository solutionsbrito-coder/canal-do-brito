import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAllBanners } from "@/hooks/useBanners";
import { useAllMovies } from "@/hooks/useMovies";
import { useAllSeries } from "@/hooks/useSeries";
import { useAllNewsReleases } from "@/hooks/useNewsReleases";
import { useAllDailyGames } from "@/hooks/useDailyGames";

// Returns current hour in America/Sao_Paulo timezone via Intl (safe on any host TZ).
const getSPHour = () => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const h = parts.find((p) => p.type === "hour")?.value ?? "0";
    return parseInt(h, 10) || 0;
  } catch {
    return new Date().getHours();
  }
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
import { getLocalDateString } from "@/lib/gameUtils";
import { offsetDateStr } from "@/lib/whatsappText";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar, Image, Film, Clapperboard, Sparkles, Trophy,
  FileText, AlertCircle, RefreshCw, MessageCircle, Settings,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { UpcomingActivations } from "@/components/admin/UpcomingActivations";
import { ContentHealthBar } from "@/components/admin/ContentHealthBar";
import { RecentActivity } from "@/components/admin/RecentActivity";
import { ContentCharts } from "@/components/admin/ContentCharts";
import { ContentHealthChecklist } from "@/components/admin/ContentHealthChecklist";
import { SportStatsFilter } from "@/components/admin/SportStatsFilter";

const useCountUp = (target: number, duration = 800) => {
  const [count, setCount] = useState(target);
  const ref = useRef<number>();
  useEffect(() => {
    if (target <= 0) { setCount(0); return; }
    if (prefersReducedMotion()) { setCount(target); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setCount(Math.round(progress * target));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);
  return count;
};

const statCards = [
  { key: "banners", icon: Image, label: "Banners", color: "text-emerald-400", bg: "from-emerald-500/[0.08] to-emerald-500/[0.02]", border: "border-emerald-500/[0.15]", barColor: "bg-emerald-500", route: "/admin/programacao?tab=categories" },
  { key: "filmes", icon: Film, label: "Filmes", color: "text-blue-400", bg: "from-blue-500/[0.08] to-blue-500/[0.02]", border: "border-blue-500/[0.15]", barColor: "bg-blue-500", route: "/admin/filmes" },
  { key: "series", icon: Clapperboard, label: "Séries", color: "text-purple-400", bg: "from-purple-500/[0.08] to-purple-500/[0.02]", border: "border-purple-500/[0.15]", barColor: "bg-purple-500", route: "/admin/series" },
  { key: "novidades", icon: Sparkles, label: "Novidades", color: "text-amber-400", bg: "from-amber-500/[0.08] to-amber-500/[0.02]", border: "border-amber-500/[0.15]", barColor: "bg-amber-500", route: "/admin/novidades" },
  { key: "jogos", icon: Trophy, label: "Jogos Hoje", color: "text-red-400", bg: "from-red-500/[0.08] to-red-500/[0.02]", border: "border-red-500/[0.15]", barColor: "bg-red-500", route: "/admin/programacao" },
];

const quickActions = [
  { label: "Publicar programação", path: "/admin/programacao", color: "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 col-span-2", icon: FileText },
  { label: "Enviar no WhatsApp", path: "/admin/whatsapp", color: "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20 col-span-2", icon: MessageCircle },
  { label: "Banner", path: "/admin/programacao?tab=categories", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20", icon: Image },
  { label: "Filme", path: "/admin/filmes", color: "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20", icon: Film },
  { label: "Série", path: "/admin/series", color: "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20", icon: Clapperboard },
  { label: "Novidade", path: "/admin/novidades", color: "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20", icon: Sparkles },
  { label: "Configurações", path: "/admin/configuracoes", color: "bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20", icon: Settings },
];

const getGreeting = () => {
  const h = getSPHour();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data: banners, isLoading: loadingBanners, isFetching: fetchingBanners, isError: errorBanners, refetch: refetchBanners, dataUpdatedAt: updatedBanners } = useAllBanners();
  const { data: movies, isLoading: loadingMovies, isFetching: fetchingMovies, isError: errorMovies, refetch: refetchMovies, dataUpdatedAt: updatedMovies } = useAllMovies();
  const { data: series, isLoading: loadingSeries, isFetching: fetchingSeries, isError: errorSeries, refetch: refetchSeries, dataUpdatedAt: updatedSeries } = useAllSeries();
  const { data: news, isLoading: loadingNews, isFetching: fetchingNews, isError: errorNews, refetch: refetchNews, dataUpdatedAt: updatedNews } = useAllNewsReleases();
  const todayStr = getLocalDateString();
  const { data: todayGames, isLoading: loadingGames, isFetching: fetchingGames, isError: errorGames, refetch: refetchGames, dataUpdatedAt: updatedGames } = useAllDailyGames(todayStr);
  const { data: tomorrowGames } = useAllDailyGames(offsetDateStr(todayStr, 1));

  const isLoading = loadingBanners || loadingMovies || loadingSeries || loadingNews || loadingGames;
  const isFetching = fetchingBanners || fetchingMovies || fetchingSeries || fetchingNews || fetchingGames;
  const hasError = errorBanners || errorMovies || errorSeries || errorNews || errorGames;

  const handleRetry = () => {
    refetchBanners(); refetchMovies(); refetchSeries(); refetchNews(); refetchGames();
  };

  const now = new Date();
  const isScheduled = (item: any) => item?.publish_at && new Date(item.publish_at) > now && !item.active;

  const totalBanners = banners?.length || 0;
  const activeBanners = banners?.filter((b) => b.active).length || 0;
  const scheduledBanners = banners?.filter(isScheduled).length || 0;
  const totalMovies = movies?.length || 0;
  const activeMovies = movies?.filter((m) => m.active).length || 0;
  const scheduledMovies = movies?.filter(isScheduled).length || 0;
  const totalSeries = series?.length || 0;
  const activeSeries = series?.filter((s) => s.active).length || 0;
  const scheduledSeriesCount = series?.filter(isScheduled).length || 0;
  const totalNews = news?.length || 0;
  const activeNews = news?.filter((n) => n.active).length || 0;
  const scheduledNews = news?.filter(isScheduled).length || 0;
  const totalGames = todayGames?.length || 0;
  const activeGames = todayGames?.filter((g) => g.active).length || 0;
  const scheduledGames = todayGames?.filter((g) => !g.active && g.publish_at && new Date(g.publish_at) > now).length || 0;

  const bCount = useCountUp(totalBanners);
  const mCount = useCountUp(totalMovies);
  const sCount = useCountUp(totalSeries);
  const nCount = useCountUp(totalNews);
  const gCount = useCountUp(totalGames);

  const counts: Record<string, number> = { banners: bCount, filmes: mCount, series: sCount, novidades: nCount, jogos: gCount };
  const actives: Record<string, number> = { banners: activeBanners, filmes: activeMovies, series: activeSeries, novidades: activeNews, jogos: activeGames };
  const totals: Record<string, number> = { banners: totalBanners, filmes: totalMovies, series: totalSeries, novidades: totalNews, jogos: totalGames };
  const scheduledMap: Record<string, number> = { banners: scheduledBanners, filmes: scheduledMovies, series: scheduledSeriesCount, novidades: scheduledNews, jogos: scheduledGames };
  const todayFormatted = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  const totalAllContent = totalBanners + totalMovies + totalSeries + totalNews;
  const totalActiveContent = activeBanners + activeMovies + activeSeries + activeNews;

  const lastUpdated = useMemo(() => {
    const timestamps = [updatedBanners, updatedMovies, updatedSeries, updatedNews, updatedGames].filter(Boolean);
    if (timestamps.length === 0) return null;
    return Math.max(...timestamps);
  }, [updatedBanners, updatedMovies, updatedSeries, updatedNews, updatedGames]);

  const freshness = [
    ["Banners", updatedBanners], ["Filmes", updatedMovies], ["Séries", updatedSeries],
    ["Novidades", updatedNews], ["Programação", updatedGames],
  ] as const;

  return (
    <div className="space-y-6">
      {/* Date card + last updated */}
      <div className="glass-panel rounded-xl p-4 bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/[0.05]">
            <Calendar className="h-5 w-5 text-foreground/80" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground capitalize">{todayFormatted}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{getGreeting()} 👋</p>
          </div>
          <div className="flex items-center gap-1.5">
            {lastUpdated && (
              <span className="text-[10px] text-muted-foreground/70" title={`Atualizado às ${format(new Date(lastUpdated), "HH:mm")}`}>
                <span className="hidden sm:inline">Atualizado </span>
                {format(new Date(lastUpdated), "HH:mm")}
              </span>
            )}
            <button
              onClick={handleRetry}
              disabled={isFetching}
              className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors disabled:opacity-60 min-h-11 min-w-11 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
              aria-label="Atualizar dados do dashboard"
              data-testid="dashboard-refresh"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground/70 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Health Bar */}
      <ContentHealthBar totalActive={totalActiveContent} totalAll={totalAllContent} isLoading={isLoading} />

      <section className="glass-panel rounded-xl border border-white/[0.08] p-4" aria-labelledby="data-diagnostics-title">
        <div className="flex items-center justify-between gap-2">
          <h2 id="data-diagnostics-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Atualização dos dados</h2>
          <span className={`text-[10px] font-semibold ${hasError ? "text-rose-400" : isFetching ? "text-amber-400" : "text-emerald-400"}`}>
            {hasError ? "Requer atenção" : isFetching ? "Atualizando" : "Normal"}
          </span>
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {freshness.map(([label, timestamp]) => (
            <li key={label} className="rounded-lg bg-white/[0.03] p-2">
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="mt-1 text-xs font-semibold text-foreground">{timestamp ? format(new Date(timestamp), "HH:mm") : "Pendente"}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Error alert */}
      {hasError && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-xs">Erro ao carregar alguns dados.</span>
            <Button variant="ghost" size="sm" onClick={handleRetry} className="h-7 px-2 text-xs gap-1">
              <RefreshCw className="h-3 w-3" /> Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Checklist de saúde (substitui alertas soltos) */}
      <ContentHealthChecklist
        todayGames={todayGames}
        tomorrowGames={tomorrowGames}
        banners={banners}
        movies={movies}
        series={series}
        news={news}
        isLoading={isLoading}
      />

      {/* Stats grid with micro progress bars */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((card, i) => {
          const total = totals[card.key] || 0;
          const active = actives[card.key] || 0;
          const ratio = total > 0 ? (active / total) * 100 : 0;
          return (
            <button
              key={card.key}
              className={`admin-stagger-${i + 1} glass-panel rounded-xl p-4 bg-gradient-to-br ${card.bg} border ${card.border} transition-all duration-300 active:scale-[0.97] hover:scale-[1.02] cursor-pointer text-left`}
              onClick={() => navigate(card.route)}
              aria-label={`${card.label}: ${totals[card.key] || 0} total, ${actives[card.key] || 0} ativos`}
            >
              {isLoading ? (
                <div className="flex flex-col items-center text-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-7 w-10 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              ) : (
                <div className="flex flex-col items-center text-center gap-2">
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                  <p className={`text-xl sm:text-2xl font-black tabular-nums ${card.color}`}>{counts[card.key]}</p>
                  <div className="w-full">
                    <p className="text-[11px] font-medium text-muted-foreground">{card.label}</p>
                    <p className="text-[11px] text-muted-foreground/70">{active} ativos</p>
                    {(scheduledMap[card.key] || 0) > 0 && (
                      <p className="text-[11px] text-amber-400/80">
                        {scheduledMap[card.key]} agendado{scheduledMap[card.key] !== 1 ? "s" : ""}
                      </p>
                    )}
                    {/* Micro progress bar */}
                    <div className="mt-1.5 h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${card.barColor} transition-all duration-700`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Charts */}
      <ContentCharts totals={totals} actives={actives} isLoading={isLoading} />

      {/* Sport Stats Filter */}
      <SportStatsFilter games={todayGames} isLoading={loadingGames} />

      {/* Upcoming Activations */}
      <UpcomingActivations />

      {/* Recent Activity */}
      <RecentActivity banners={banners} movies={movies} series={series} news={news} games={todayGames} isLoading={isLoading} />

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Ações Rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={`flex items-center justify-center gap-1.5 p-3 rounded-xl border font-semibold text-[11px] sm:text-xs transition-all min-h-[48px] cursor-pointer ${action.color}`}
            >
              <action.icon className="h-4 w-4" />
              {action.label.startsWith("Publicar") || action.label.startsWith("Enviar") ? action.label : `+ ${action.label}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
