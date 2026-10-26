import { useDailyGames } from "@/hooks/useDailyGames";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { isGameCurrentlyLive, getLocalDateString, getElapsedMinutes, SPORT_EMOJI, isNonAdversarial, type SportType } from "@/lib/gameUtils";
import { Radio, Zap, Clock } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { ChannelBadgeList } from "./ChannelBadge";

export const LiveNowSection = () => {
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

  const liveGames = useMemo(() => {
    return (games || []).filter((g) => {
      const st = (g.sport_type || 'football') as SportType;
      return !isNonAdversarial(st) && isGameCurrentlyLive(g.game_time, g.date, st);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games, Math.floor(Date.now() / 60000)]);

  return (
    <section className="space-y-3">
      <div className="px-4">
        <SectionHeader
          icon={Zap}
          title="Ao Vivo"
          subtitle="Acompanhe os jogos em tempo real"
          badge={
            liveGames.length > 0 ? (
              <span className="text-[10px] bg-destructive/15 text-destructive rounded-full px-2 py-0.5 font-bold font-body tabular-nums animate-pulse">
                {liveGames.length} ao vivo
              </span>
            ) : undefined
          }
        />
      </div>

      {liveGames.length === 0 ? (
        <div className="mx-4 rounded-2xl border border-border/10 bg-card p-3 flex items-center gap-3">
          <div className="p-2 rounded-full bg-muted/50 shrink-0">
            <Radio className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground font-body">
              Nenhum jogo ao vivo
            </p>
            <p className="text-[11px] text-muted-foreground/60 font-body">
              Aparecerão aqui quando começarem
            </p>
          </div>
        </div>
      ) : (
        <div data-horizontal-scroll className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2 snap-x snap-mandatory">
          {liveGames.map((game, idx) => {
            const sportType = (game.sport_type || 'football') as SportType;
            const elapsed = getElapsedMinutes(game.game_time, game.date, sportType);
            const emoji = SPORT_EMOJI[sportType] || '⚽';
            const isF1 = sportType === 'f1';

            return (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.3 }}
                className="min-w-[280px] w-[75vw] max-w-[340px] shrink-0 snap-start"
              >
                <div className="rounded-2xl bg-card border border-destructive/30 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_32px_hsl(0,84%,60%,0.25)] hover:border-destructive/50 group">
                  {/* Accent bar with shimmer */}
                  <div className="relative h-1 overflow-hidden bg-gradient-to-r from-destructive via-destructive/60 to-transparent">
                    <div className="absolute inset-0 -translate-x-full animate-shimmer-sweep bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                  </div>

                  <div className="p-3.5 space-y-2.5 relative">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-destructive/5 rounded-full blur-2xl" />

                    {/* Competition + Live indicator */}
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider truncate max-w-[55%] font-body">
                        {emoji} {game.competition}
                        {game.competition_detail && ` · ${game.competition_detail}`}
                      </p>
                      <div className="inline-flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full bg-destructive/15 border border-destructive/30">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                        </span>
                        <span className="text-[10px] font-extrabold text-destructive tabular-nums font-body">
                          {elapsed !== null ? `${elapsed}'` : "LIVE"}
                        </span>
                      </div>
                    </div>

                    {/* Teams */}
                    {(isF1 || isNonAdversarial(sportType) || !game.away_team) ? (
                      <div className="text-center space-y-0.5">
                        <p className="text-[13px] font-extrabold text-foreground leading-tight font-body line-clamp-2">
                          {game.home_team}
                          {game.away_team && game.away_team !== game.home_team && ` — ${game.away_team}`}
                        </p>
                        {game.competition_detail && (
                          <p className="text-[11px] text-muted-foreground/70 font-medium font-body truncate">
                            {game.competition_detail}
                          </p>
                        )}
                      </div>
                    ) : (() => {
                      const isLongNames = game.home_team.length > 15 || (game.away_team?.length || 0) > 15;
                      const separator = sportType === 'tennis' || sportType === 'mma' ? 'VS' : 'X';
                      return isLongNames ? (
                        <div className="space-y-1 text-center">
                          <p className="text-[13px] font-extrabold text-foreground leading-tight font-body line-clamp-2">
                            {game.home_team}
                          </p>
                          <div className="flex justify-center">
                            <div className="px-2 py-0.5 rounded-lg bg-gradient-to-br from-destructive/25 to-destructive/10 border border-destructive/30">
                              <span className="text-[10px] font-extrabold text-destructive font-body">{separator}</span>
                            </div>
                          </div>
                          <p className="text-[13px] font-extrabold text-foreground leading-tight font-body line-clamp-2">
                            {game.away_team}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-extrabold text-foreground flex-1 text-left leading-tight font-body line-clamp-2">
                              {game.home_team}
                            </p>
                            <div className="shrink-0 px-2 py-1 rounded-lg bg-gradient-to-br from-destructive/25 to-destructive/10 border border-destructive/30">
                              <span className="text-[11px] font-extrabold text-destructive font-body">{separator}</span>
                            </div>
                            <p className="text-[13px] font-extrabold text-foreground flex-1 text-right leading-tight font-body line-clamp-2">
                              {game.away_team}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Footer: Time + Channels */}
                  <div className="px-3.5 py-2 flex items-center justify-between gap-2 bg-muted/20 border-t border-border/30">
                    <div className="flex items-center gap-1 text-muted-foreground/70">
                      <Clock className="h-3 w-3" />
                      <span className="text-[10px] font-medium tabular-nums font-body">
                        {game.game_time?.slice(0, 5)}
                      </span>
                    </div>
                    {game.channels && game.channels.length > 0 ? (
                      <ChannelBadgeList channels={game.channels} max={3} size="sm" className="justify-end gap-1" />
                    ) : (
                      <span className="text-[9px] uppercase tracking-wide text-muted-foreground/60">Sem transmissão</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
};
