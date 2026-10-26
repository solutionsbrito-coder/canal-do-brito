import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { useAllDailyGamesRange } from "@/hooks/useDailyGames";
import { getLocalDateString, isGameCurrentlyLive, type SportType } from "@/lib/gameUtils";
import { useMemo } from "react";
import { useLiveTick } from "@/hooks/useLiveTick";
import { offsetDateStr } from "@/lib/whatsappText";

export const AppNavbar = () => {
  const today = new Date();
  const dateStr = getLocalDateString();
  const tomorrow = offsetDateStr(dateStr, 1);
  const { data: rangeGames } = useAllDailyGamesRange([dateStr, tomorrow]);
  const games = useMemo(
    () => (rangeGames ?? []).filter((game) => game.date === dateStr && game.active && !game.archived),
    [rangeGames, dateStr],
  );
  const tick = useLiveTick();

  const liveCount = useMemo(() => {
    return (games || []).filter((g) => {
      const st = (g.sport_type || "football") as SportType;
      return isGameCurrentlyLive(g.game_time, g.date, st);
    }).length;
  }, [games, tick]);

  return (
    <header className="sticky top-0 z-50 glass-nav" style={{ height: 54 }}>
      <div className="flex items-center justify-between px-4 h-full">
        {/* Left: Logo + Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-[30px] h-[30px] rounded-lg bg-green-dim">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-primary">
              <rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M10 9l5 3-5 3V9z" fill="currentColor" />
              <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="18" x2="12" y2="21" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight font-body">
            <span className="text-foreground">Canal do</span>{" "}
            <span className="text-primary">Brito</span>
          </span>
        </div>

        {/* Center: Date — hidden on mobile */}
        <p className="hidden sm:block text-xs text-muted-foreground capitalize font-body">
          {format(today, "EEE · d MMM", { locale: ptBR })}
        </p>

        {/* Right: Live badge + CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          {liveCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary font-body min-h-[44px]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary animate-pulse-live" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="hidden xs:inline">{liveCount}</span> ao vivo
            </div>
          )}
          <Link
            to="/assinar"
            aria-label="Assinar Canal do Brito"
            className="bg-primary text-primary-foreground text-[11px] font-bold px-3.5 rounded-full hover:opacity-90 transition-opacity min-h-[44px] flex items-center"
          >
            Assine já
          </Link>
        </div>
      </div>
      <div className="section-divider" />
    </header>
  );
};
