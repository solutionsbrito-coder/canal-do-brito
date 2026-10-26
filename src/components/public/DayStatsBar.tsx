import { useMemo, useState, useEffect } from "react";
import { type DailyGame } from "@/hooks/useDailyGames";
import { isGameCurrentlyLive, SPORT_EMOJI, type SportType } from "@/lib/gameUtils";

interface DayStatsBarProps {
  games: DailyGame[];
}

export const DayStatsBar = ({ games }: DayStatsBarProps) => {
  const [tick, setTick] = useState(Math.floor(Date.now() / 60000));

  useEffect(() => {
    const timer = setInterval(() => setTick(Math.floor(Date.now() / 60000)), 60000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    const liveCount = games.filter((g) =>
      isGameCurrentlyLive(g.game_time, g.date, (g.sport_type || 'football') as SportType)
    ).length;

    const sportCounts: Record<string, number> = {};
    games.forEach((g) => {
      const st = (g.sport_type || 'football') as SportType;
      sportCounts[st] = (sportCounts[st] || 0) + 1;
    });

    return { total: games.length, liveCount, sportCounts };
  }, [games, tick]);

  if (stats.total === 0) return null;

  return (
    <div data-horizontal-scroll className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-1">
      {/* Total */}
      <div className="flex items-center gap-1.5 shrink-0 bg-card/60 backdrop-blur border border-border/20 rounded-xl px-3 py-1.5">
        <span className="text-[10px] font-bold text-muted-foreground/70">Total</span>
        <span className="text-xs font-bold text-foreground tabular-nums">{stats.total}</span>
      </div>

      {/* Live */}
      {stats.liveCount > 0 && (
        <div className="flex items-center gap-1.5 shrink-0 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-1.5 animate-pulse">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-destructive" />
          </span>
          <span className="text-[10px] font-bold text-destructive">{stats.liveCount} ao vivo</span>
        </div>
      )}

      {/* Sport breakdown */}
      {Object.entries(stats.sportCounts).map(([sport, count]) => (
        <div
          key={sport}
          className="flex items-center gap-1 shrink-0 bg-card/40 border border-border/15 rounded-xl px-2.5 py-1.5"
        >
          <span className="text-xs">{SPORT_EMOJI[sport as SportType] || '⚽'}</span>
          <span className="text-[10px] font-bold text-muted-foreground tabular-nums">{count}</span>
        </div>
      ))}
    </div>
  );
};
