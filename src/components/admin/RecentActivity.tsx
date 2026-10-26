import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Image, Film, Clapperboard, Sparkles, Trophy } from "lucide-react";
import type { Banner } from "@/hooks/useBanners";

interface ActivityItem {
  type: "banner" | "filme" | "série" | "novidade" | "jogo";
  title: string;
  created_at: string;
  route: string;
}

const typeConfig = {
  banner: { icon: Image, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  filme: { icon: Film, color: "text-blue-400", bg: "bg-blue-500/10" },
  série: { icon: Clapperboard, color: "text-purple-400", bg: "bg-purple-500/10" },
  novidade: { icon: Sparkles, color: "text-amber-400", bg: "bg-amber-500/10" },
  jogo: { icon: Trophy, color: "text-red-400", bg: "bg-red-500/10" },
};

interface RecentActivityProps {
  banners: Banner[] | undefined;
  movies: any[] | undefined;
  series: any[] | undefined;
  news: any[] | undefined;
  games: any[] | undefined;
  isLoading: boolean;
}

export const RecentActivity = React.forwardRef<HTMLDivElement, RecentActivityProps>(({ banners, movies, series, news, games, isLoading }, ref) => {
  const navigate = useNavigate();

  const items = useMemo(() => {
    const all: ActivityItem[] = [];
    const safe = (created: any) => {
      if (!created) return null;
      const t = new Date(created).getTime();
      return Number.isFinite(t) ? created : null;
    };
    banners?.forEach(b => { const c = safe(b.created_at); if (c) all.push({ type: "banner", title: b.title || (b.image_url ? b.image_url.slice(-20) : "Banner"), created_at: c, route: "/admin/programacao?tab=categories" }); });
    movies?.forEach(m => { const c = safe(m.created_at); if (c) all.push({ type: "filme", title: m.title, created_at: c, route: "/admin/filmes" }); });
    series?.forEach(s => { const c = safe(s.created_at); if (c) all.push({ type: "série", title: s.title, created_at: c, route: "/admin/series" }); });
    news?.forEach(n => { const c = safe(n.created_at); if (c) all.push({ type: "novidade", title: n.title, created_at: c, route: "/admin/novidades" }); });
    games?.forEach(g => { const c = safe(g.created_at); if (c) all.push({ type: "jogo", title: `${g.home_team} x ${g.away_team}`, created_at: c, route: "/admin/programacao" }); });
    return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);
  }, [banners, movies, series, news, games]);

  if (isLoading) return null;
  if (items.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-center space-y-2">
        <p className="text-sm font-semibold text-foreground">Nenhuma atividade recente.</p>
        <p className="text-xs text-muted-foreground">Publique a programação de hoje para começar.</p>
        <button
          onClick={() => navigate("/admin/programacao")}
          className="inline-flex items-center justify-center min-h-11 px-4 rounded-lg bg-primary/15 text-primary border border-primary/30 text-xs font-bold hover:bg-primary/20 transition-colors"
        >
          Ir para Programação
        </button>
      </div>
    );
  }

  const renderItem = (item: ActivityItem, i: number) => {
    const config = typeConfig[item.type];
    const Icon = config.icon;
    return (
      <button
        key={`${item.type}-${i}`}
        onClick={() => navigate(item.route)}
        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] transition-colors text-left"
      >
        <div className={`p-1.5 rounded-lg ${config.bg}`}>
          <Icon className={`h-3.5 w-3.5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground/90 truncate">{item.title}</p>
          <p className="text-[9px] text-muted-foreground/60 capitalize">{item.type}</p>
        </div>
        <span className="text-[9px] text-muted-foreground/50 whitespace-nowrap">
          {formatDistanceToNow(new Date(item.created_at), { locale: ptBR, addSuffix: true })}
        </span>
      </button>
    );
  };

  const visible = items.slice(0, 5);
  const extra = items.slice(5);

  return (
    <div ref={ref}>
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Atividade Recente</h2>
      <div className="space-y-2">
        {visible.map(renderItem)}
        {extra.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-[10px] text-muted-foreground/70 hover:text-foreground/90 px-2 py-1.5 list-none flex items-center gap-1 select-none">
              <span className="group-open:hidden">▸ Ver mais ({extra.length})</span>
              <span className="hidden group-open:inline">▾ Ver menos</span>
            </summary>
            <div className="space-y-2 mt-2">
              {extra.map((item, i) => renderItem(item, i + 5))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
});
RecentActivity.displayName = "RecentActivity";
