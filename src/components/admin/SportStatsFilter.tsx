import { useMemo, useState } from "react";
import { SPORT_EMOJI, SPORT_LABEL, type SportType } from "@/lib/gameUtils";
import type { DailyGame } from "@/hooks/useDailyGames";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Filter } from "lucide-react";

interface SportStatsFilterProps {
  games: DailyGame[] | undefined;
  isLoading: boolean;
}

interface SportStat {
  sport: SportType;
  label: string;
  emoji: string;
  total: number;
  active: number;
  live: number;
}

export const SportStatsFilter = ({ games, isLoading }: SportStatsFilterProps) => {
  const [selected, setSelected] = useState<SportType | null>(null);

  const stats = useMemo(() => {
    if (!games || games.length === 0) return [];

    const map = new Map<string, { total: number; active: number; live: number }>();
    for (const g of games) {
      const st = g.sport_type || "football";
      const cur = map.get(st) || { total: 0, active: 0, live: 0 };
      cur.total++;
      if (g.active) cur.active++;
      if (g.is_live) cur.live++;
      map.set(st, cur);
    }

    return Array.from(map.entries())
      .map(([sport, counts]) => ({
        sport: sport as SportType,
        label: SPORT_LABEL[sport as SportType] || sport,
        emoji: SPORT_EMOJI[sport as SportType] || "🏆",
        ...counts,
      }))
      .sort((a, b) => b.total - a.total);
  }, [games]);

  const filteredGames = useMemo(() => {
    if (!selected || !games) return null;
    return games.filter((g) => (g.sport_type || "football") === selected);
  }, [games, selected]);

  if (isLoading) {
    return <Skeleton className="h-32 rounded-xl" />;
  }

  if (stats.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-3.5 w-3.5 text-muted-foreground/60" />
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Jogos por Esporte
        </h2>
        {selected && (
          <button
            onClick={() => setSelected(null)}
            className="text-[10px] text-muted-foreground/60 hover:text-foreground/80 transition-colors ml-auto underline underline-offset-2"
          >
            Limpar filtro
          </button>
        )}
      </div>

      {/* Sport pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        {stats.map((s) => {
          const isActive = selected === s.sport;
          return (
            <button
              key={s.sport}
              onClick={() => setSelected(isActive ? null : s.sport)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                border transition-all duration-200
                ${isActive
                  ? "bg-primary/20 border-primary/40 text-primary shadow-sm shadow-primary/10"
                  : "bg-white/[0.03] border-white/[0.08] text-muted-foreground hover:bg-white/[0.06] hover:border-white/[0.12]"
                }
              `}
            >
              <span>{s.emoji}</span>
              <span>{s.label}</span>
              <span className={`
                inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full px-1 text-[10px] font-bold
                ${isActive ? "bg-primary/30 text-primary" : "bg-white/[0.06] text-muted-foreground/70"}
              `}>
                {s.total}
              </span>
              {s.live > 0 && (
                <span className="flex items-center gap-0.5 text-[9px] text-red-400 font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  {s.live}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Detail panel when a sport is selected */}
      {selected && filteredGames && filteredGames.length > 0 && (
        <div className="glass-panel rounded-xl p-3 border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-[11px] font-bold text-foreground/80">
              {SPORT_EMOJI[selected]} {SPORT_LABEL[selected] || selected} — {filteredGames.length} jogo{filteredGames.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {filteredGames.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs"
              >
                {g.is_live && (
                  <span className="flex items-center gap-0.5 text-[9px] text-red-400 font-bold shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    AO VIVO
                  </span>
                )}
                <span className="text-muted-foreground/60 shrink-0 w-10 text-right tabular-nums">
                  {g.game_time?.slice(0, 5)}
                </span>
                <span className="font-medium text-foreground/90 truncate flex-1">
                  {g.home_team} x {g.away_team}
                </span>
                <span className="text-[10px] text-muted-foreground/50 truncate max-w-[120px]">
                  {g.competition}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                    g.active
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-white/[0.04] text-muted-foreground/40"
                  }`}
                >
                  {g.active ? "Ativo" : "Inativo"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
