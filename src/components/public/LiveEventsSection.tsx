import { useDailyGames } from "@/hooks/useDailyGames";
import { useState, useEffect, useMemo } from "react";
import { isGameCurrentlyLive, getLocalDateString, getElapsedMinutes, SPORT_EMOJI, isNonAdversarial, type SportType } from "@/lib/gameUtils";
import { ChannelBadge } from "./ChannelBadge";

export const LiveEventsSection = () => {
  const [today, setToday] = useState(() => getLocalDateString());
  const { data: games } = useDailyGames(today);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setToday(getLocalDateString());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const liveEvents = useMemo(() => {
    return (games || []).filter((g) => {
      const st = (g.sport_type || "football") as SportType;
      return isNonAdversarial(st) && isGameCurrentlyLive(g.game_time, g.date, st);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games, Math.floor(Date.now() / 60000)]);

  if (liveEvents.length === 0) return null;

  return (
    <section className="space-y-3 animate-fade-up stagger-5">
      <div className="px-4 flex items-center gap-2">
        <span className="text-sm">🏁</span>
        <h3 className="text-sm font-bold text-foreground font-body">Eventos ao Vivo</h3>
        <span className="text-[10px] bg-amber-500/15 text-amber-500 rounded-full px-2 py-0.5 font-bold font-body tabular-nums">
          {liveEvents.length} ao vivo
        </span>
      </div>

      <div className="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[9px]">
        {liveEvents.map((event) => {
          const sportType = (event.sport_type || "f1") as SportType;
          const elapsed = getElapsedMinutes(event.game_time, event.date, sportType);
          const emoji = SPORT_EMOJI[sportType] || "🏁";
          const channel = event.channels?.[0];

          return (
            <div
              key={event.id}
              className="rounded-[14px] overflow-hidden bg-surface-2 border border-border transition-all duration-300 hover:border-amber-500/40 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(245,158,11,0.18)] group"
            >
              <div className="relative h-[2.5px] overflow-hidden bg-gradient-to-r from-amber-500/80 via-orange-500/60 to-transparent">
                <div className="absolute inset-0 -translate-x-full animate-shimmer-sweep bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider truncate font-body">
                    {emoji} {event.competition}
                    {event.competition_detail && ` · ${event.competition_detail}`}
                  </p>
                  <div className="inline-flex items-center gap-1.5 shrink-0 px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500 animate-pulse-live" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                    </span>
                    <span className="text-[9px] font-extrabold text-amber-500 tabular-nums font-body">
                      {elapsed !== null ? `${elapsed}'` : "LIVE"}
                    </span>
                  </div>
                </div>

                <div className="text-center space-y-0.5">
                  <p className="text-[13px] font-extrabold text-foreground leading-tight font-body line-clamp-2">
                    {event.home_team}
                    {event.away_team && event.away_team !== event.home_team && ` — ${event.away_team}`}
                  </p>
                  {event.competition_detail && (
                    <p className="text-[10px] text-muted-foreground font-body truncate">
                      {event.competition_detail}
                    </p>
                  )}
                </div>
              </div>

              <div className="px-3 py-2 flex items-center justify-between gap-2 border-t border-border bg-muted/20">
                <span className="text-[9px] text-muted-foreground font-body tabular-nums">
                  {event.game_time?.slice(0, 5)}
                </span>
                {event.channels && event.channels.length > 0 && (
                  <div className="flex gap-1 items-center justify-end">
                    {event.channels.slice(0, 2).map((ch) => (
                      <ChannelBadge key={ch} name={ch} size="sm" />
                    ))}
                    {event.channels.length > 2 && (
                      <span className="text-[9px] text-muted-foreground/60 font-bold">
                        +{event.channels.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
