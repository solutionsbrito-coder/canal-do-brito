import { Trophy } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DailyGame } from "@/hooks/useDailyGames";
import { isGameCurrentlyLive, SPORT_EMOJI, SPORT_LABEL, type SportType } from "@/lib/gameUtils";
import { useMemo } from "react";

interface ScheduleHeaderProps {
  games: DailyGame[];
  filteredCount: number;
  todayDate: string;
}

export const ScheduleHeader = ({ games, filteredCount, todayDate }: ScheduleHeaderProps) => {
  const { liveCount, sportCounts } = useMemo(() => {
    const sc: Record<string, number> = {};
    let live = 0;
    games.forEach((g) => {
      const st = (g.sport_type || "football") as SportType;
      sc[st] = (sc[st] || 0) + 1;
      if (isGameCurrentlyLive(g.game_time, g.date, st)) live++;
    });
    return { liveCount: live, sportCounts: sc };
  }, [games]);

  const sortedSports = Object.entries(sportCounts).sort((a, b) => b[1] - a[1]);

  return (
    <header className="space-y-2.5">
      {/* Title row */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/10 border border-primary/20">
          <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary" aria-hidden />
        </div>
        <h2 className="font-display text-base sm:text-xl font-bold text-foreground tracking-tight">
          Programação
        </h2>
        <span className="text-[11px] text-muted-foreground/70 capitalize font-medium">
          {format(new Date(todayDate + "T12:00:00"), "EEE · d MMM", { locale: ptBR })}
        </span>
      </div>

      {/* Stats row — single horizontally-scrollable row */}
      <div
        data-horizontal-scroll
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 py-0.5"
        aria-label="Resumo do dia"
      >
        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground bg-card/60 border border-border/20 rounded-full px-2.5 py-1 tabular-nums">
          {filteredCount}
          <span className="text-muted-foreground/70">jogos</span>
        </span>
        {liveCount > 0 && (
          <span className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-destructive bg-destructive/15 border border-destructive/30 rounded-full px-2.5 py-1 motion-safe:animate-pulse tabular-nums">
            <span className="relative flex h-1.5 w-1.5">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-destructive" />
            </span>
            {liveCount} ao vivo
          </span>
        )}
        {sortedSports.length > 0 && (
          <span className="shrink-0 text-muted-foreground/30 text-xs">·</span>
        )}
        {sortedSports.map(([sport, count]) => (
          <span
            key={sport}
            className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-card/40 border border-border/15 rounded-full px-2 py-0.5 tabular-nums"
            aria-label={`${count} jogos de ${SPORT_LABEL[sport as SportType]}`}
          >
            <span aria-hidden>{SPORT_EMOJI[sport as SportType] || "⚽"}</span>
            {count}
          </span>
        ))}
      </div>
    </header>
  );
};
