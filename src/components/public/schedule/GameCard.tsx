import { memo } from "react";
import { motion } from "framer-motion";
import { Clock, Flame } from "lucide-react";
import type { DailyGame } from "@/hooks/useDailyGames";
import {
  isGameCurrentlyLive,
  getMinutesUntilStart,
  formatCountdown,
  isNonAdversarial,
  SPORT_EMOJI,
  SPORT_LABEL,
  type SportType,
} from "@/lib/gameUtils";
import { ChannelBadgeList } from "../ChannelBadge";
import { getSportTheme, isHighlightCompetition } from "./GameCardSportTheme";

interface GameCardProps {
  game: DailyGame;
  index: number;
  /** Kept for API compatibility; reminder UI removed. */
  onPushReminder?: (gameId: string, add: boolean) => void;
}

const GameCardImpl = ({ game, index }: GameCardProps) => {
  const sportType = (game.sport_type || "football") as SportType;
  const theme = getSportTheme(sportType);
  const sportLabel = SPORT_LABEL[sportType] || theme.label;
  const sportEmoji = SPORT_EMOJI[sportType] || "⚽";

  const live = isGameCurrentlyLive(game.game_time, game.date, sportType);
  const highlight = isHighlightCompetition(game.competition);
  const minsUntil = getMinutesUntilStart(game.game_time, game.date);
  const isSoon = minsUntil !== null && minsUntil > 0 && minsUntil <= 120;
  const eventLayout = isNonAdversarial(sportType) || !game.away_team;

  const ariaLabel = `${sportLabel}: ${
    eventLayout ? game.home_team : `${game.home_team} vs ${game.away_team}`
  }, ${game.competition}, ${game.game_time?.slice(0, 5)}${live ? ", ao vivo" : ""}${
    game.is_womens ? ", feminino" : ""
  }`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.03, duration: 0.25, ease: "easeOut" }}
      className="group min-w-0"
      aria-label={ariaLabel}
      tabIndex={0}
    >
      <div
        className="relative rounded-2xl overflow-hidden bg-card/70 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-primary/50"
        style={{
          border: `1px solid ${live ? "hsl(var(--live) / 0.55)" : theme.border}`,
          boxShadow: live ? theme.glow : highlight ? "0 8px 28px -16px hsl(var(--primary) / 0.35)" : undefined,
        }}
      >
        {/* Sport identity strip */}
        <div
          className="flex items-center justify-between px-3 py-1.5 text-foreground"
          style={{ background: theme.stripGradient }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[13px] leading-none" aria-hidden>
              {sportEmoji}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] truncate">
              {sportLabel}
            </span>
            <span className="text-foreground/40 text-[10px]">·</span>
            <span className="text-[10px] font-semibold text-foreground/85 truncate max-w-[40vw] sm:max-w-[180px]">
              {game.competition}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {highlight && (
              <Flame className="h-3 w-3 text-amber-300 motion-safe:animate-pulse" aria-label="Destaque" />
            )}
            {game.is_womens && (
              <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-pink-500/25 text-pink-100 border border-pink-300/30">
                ♀
              </span>
            )}
          </div>
        </div>

        {/* Big sport watermark */}
        <span
          aria-hidden
          className="pointer-events-none select-none absolute -right-2 -bottom-3 text-[88px] leading-none opacity-[0.05]"
        >
          {sportEmoji}
        </span>

        {/* Body */}
        <div className="relative p-3 sm:p-4 space-y-2.5">
          {/* Status row: live / countdown */}
          {(live || isSoon) && (
            <div className="flex items-center">
              {live ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-destructive/20 text-destructive border border-destructive/35 motion-safe:animate-pulse">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-destructive" />
                  </span>
                  Ao vivo
                  {game.elapsed_minutes ? (
                    <span className="tabular-nums">· {game.elapsed_minutes}'</span>
                  ) : null}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30 tabular-nums motion-safe:animate-pulse">
                  Começa em {minsUntil ? formatCountdown(minsUntil) : ""}
                </span>
              )}
            </div>
          )}

          {/* Round / detail */}
          {game.competition_detail && (
            <p className="text-[10px] text-muted-foreground/70 font-medium truncate">
              {game.competition_detail}
            </p>
          )}

          {/* Teams / event */}
          {eventLayout ? (
            <div className="flex items-center gap-3">
              <p className="flex-1 text-center text-[13px] sm:text-base font-bold text-foreground leading-tight truncate min-w-0">
                {game.home_team}
                {game.away_team && game.away_team !== game.home_team && (
                  <span className="block text-[11px] font-medium text-muted-foreground/70 mt-0.5 truncate">
                    {game.away_team}
                  </span>
                )}
              </p>
              <TimePill time={game.game_time} live={live} isSoon={isSoon} themeColor={theme.color} />
            </div>
          ) : (
            <div className="flex items-stretch gap-2 min-w-0">
              <p
                className="flex-1 text-left text-[13px] sm:text-sm font-bold text-foreground leading-tight truncate min-w-0"
                title={game.home_team}
              >
                {game.home_team}
              </p>
              <div className="flex flex-col items-center shrink-0">
                <TimePill time={game.game_time} live={live} isSoon={isSoon} themeColor={theme.color} />
                <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50 mt-0.5">
                  vs
                </span>
              </div>
              <p
                className="flex-1 text-right text-[13px] sm:text-sm font-bold text-foreground leading-tight truncate min-w-0"
                title={game.away_team}
              >
                {game.away_team}
              </p>
            </div>
          )}

          {/* Channels */}
          {game.channels && game.channels.length > 0 ? (
            <div className="space-y-1.5">
              <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">
                ▶ Onde assistir
              </span>
              <ChannelBadgeList channels={game.channels} max={2} />
            </div>
          ) : (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60 px-2 py-0.5 rounded border border-border/40 bg-muted/20 self-start inline-block">
              Sem transmissão confirmada
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
};

const TimePill = ({
  time,
  live,
  isSoon,
  themeColor,
}: {
  time: string | null | undefined;
  live: boolean;
  isSoon: boolean;
  themeColor: string;
}) => (
  <div
    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 border tabular-nums ${
      live
        ? "bg-destructive/15 border-destructive/35 text-destructive"
        : isSoon
          ? "bg-warning/15 border-warning/35 text-warning"
          : "bg-card/50 border-border/40"
    }`}
    style={!live && !isSoon ? { color: themeColor } : undefined}
  >
    <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
    <span className="text-xs sm:text-sm font-bold tracking-wide">{time?.slice(0, 5)}</span>
  </div>
);


export const GameCard = memo(GameCardImpl);
