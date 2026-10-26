import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Zap } from "lucide-react";
import { type DailyGame } from "@/hooks/useDailyGames";
import { getMinutesUntilStart, formatCountdown, isGameCurrentlyLive, isNonAdversarial, SPORT_EMOJI, SPORT_LABEL, type SportType } from "@/lib/gameUtils";
import { ChannelBadge } from "./ChannelBadge";
import { getSportTheme } from "./schedule/GameCardSportTheme";

interface NextGameHeroProps {
  games: DailyGame[];
}

export const NextGameHero = ({ games }: NextGameHeroProps) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const nextGame = useMemo(() => {
    const upcoming = games.filter((g) => {
      const live = isGameCurrentlyLive(g.game_time, g.date, (g.sport_type || 'football') as SportType);
      const mins = getMinutesUntilStart(g.game_time, g.date);
      return !live && mins !== null && mins > 0;
    });
    if (upcoming.length === 0) return null;
    // Sort by absolute start time (handles cross-day)
    upcoming.sort((a, b) => {
      const ma = getMinutesUntilStart(a.game_time, a.date) ?? Infinity;
      const mb = getMinutesUntilStart(b.game_time, b.date) ?? Infinity;
      return ma - mb;
    });
    return upcoming[0];
  }, [games]);

  if (!nextGame) return null;
  // Hide hero if next game is more than 12h away — avoids stale empty mornings
  const minsCheck = getMinutesUntilStart(nextGame.game_time, nextGame.date);
  if (minsCheck === null || minsCheck > 12 * 60) return null;

  const sportType = (nextGame.sport_type || 'football') as SportType;
  const emoji = SPORT_EMOJI[sportType] || '⚽';
  const sportLabel = SPORT_LABEL[sportType] || 'Esporte';
  const theme = getSportTheme(sportType);
  const nonAdversarial = isNonAdversarial(sportType);
  const mins = getMinutesUntilStart(nextGame.game_time, nextGame.date);
  const countdown = mins ? formatCountdown(mins) : "";
  const isSoon = mins !== null && mins <= 30;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div
        className="relative rounded-2xl overflow-hidden bg-card/70 backdrop-blur-xl"
        style={{ border: `1px solid ${theme.border}`, boxShadow: theme.glow }}
      >
        {/* Sport identity strip */}
        <div
          className="flex items-center justify-between px-3 py-1.5 text-foreground"
          style={{ background: theme.stripGradient }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
              {nonAdversarial ? "Próximo evento" : "Próximo jogo"}
            </span>
            <span className="text-foreground/40 text-[10px]">·</span>
            <span className="text-[10px] font-semibold text-foreground/85 truncate">
              {emoji} {sportLabel}
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/70 truncate max-w-[40vw]">
            {nextGame.competition}
          </span>
        </div>

        {/* Watermark */}
        <span
          aria-hidden
          className="pointer-events-none select-none absolute -right-2 -bottom-3 text-[88px] leading-none opacity-[0.05]"
        >
          {emoji}
        </span>

        <div className="relative p-3 sm:p-5 space-y-3">
          {/* Teams / Event */}
          {nonAdversarial ? (
            <div className="flex items-center gap-3">
              <p className="text-sm sm:text-lg font-bold text-foreground flex-1 text-center truncate min-w-0">
                {nextGame.home_team}
                {nextGame.away_team && nextGame.away_team !== nextGame.home_team && ` — ${nextGame.away_team}`}
              </p>
              <div className="flex flex-col items-center shrink-0">
                <div className={`flex items-center gap-1.5 rounded-xl px-4 py-2 border ${
                  isSoon
                    ? "bg-warning/15 border-warning/30"
                    : "bg-primary/10 border-primary/20"
                }`}>
                  <Clock className={`h-4 w-4 ${isSoon ? "text-warning animate-pulse" : "text-primary"}`} />
                  <span className={`text-base font-bold tabular-nums tracking-wide ${
                    isSoon ? "text-warning" : "text-primary"
                  }`}>
                    {nextGame.game_time?.slice(0, 5)}
                  </span>
                </div>
                {countdown && (
                  <span className={`text-[10px] font-bold mt-1 tabular-nums ${
                    isSoon ? "text-warning animate-pulse" : "text-muted-foreground/60"
                  }`}>
                    em {countdown}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm sm:text-lg font-bold text-foreground flex-1 text-left truncate min-w-0">
                {nextGame.home_team}
              </p>
              <div className="flex flex-col items-center shrink-0">
                <div className={`flex items-center gap-1.5 rounded-xl px-4 py-2 border ${
                  isSoon
                    ? "bg-warning/15 border-warning/30"
                    : "bg-primary/10 border-primary/20"
                }`}>
                  <Clock className={`h-4 w-4 ${isSoon ? "text-warning animate-pulse" : "text-primary"}`} />
                  <span className={`text-base font-bold tabular-nums tracking-wide ${
                    isSoon ? "text-warning" : "text-primary"
                  }`}>
                    {nextGame.game_time?.slice(0, 5)}
                  </span>
                </div>
                {countdown && (
                  <span className={`text-[10px] font-bold mt-1 tabular-nums ${
                    isSoon ? "text-warning animate-pulse" : "text-muted-foreground/60"
                  }`}>
                    em {countdown}
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-lg font-bold text-foreground flex-1 text-right truncate min-w-0">
                {nextGame.away_team}
              </p>
            </div>
          )}

          {/* Channels */}
          {nextGame.channels && nextGame.channels.length > 0 ? (
            <div className="space-y-1.5">
              <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">
                ▶ Onde assistir
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {nextGame.channels.slice(0, 3).map((ch, i) => (
                  <ChannelBadge key={i} name={ch} />
                ))}
                {nextGame.channels.length > 3 && (
                  <span className="inline-flex items-center text-[10px] font-bold text-muted-foreground/70 bg-card/40 border border-border/30 rounded-md px-2 py-1">
                    +{nextGame.channels.length - 3}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 px-2 py-1 rounded border border-border/40 bg-muted/20 self-start inline-block">
              Sem transmissão confirmada
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
