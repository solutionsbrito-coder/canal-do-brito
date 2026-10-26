import { ChannelBadge } from "./ChannelBadge";
import { useDailyGames, type DailyGame } from "@/hooks/useDailyGames";
import { useState, useEffect, useMemo } from "react";
import {
  isGameCurrentlyLive,
  getLocalDateString,
  getElapsedMinutes,
  SPORT_EMOJI,
  isNonAdversarial,
  type SportType,
} from "@/lib/gameUtils";

type CardSport = "football" | "basketball" | "volleyball" | "tennis" | "other";

const SPORT_ACCENT: Record<CardSport, string> = {
  football: "hsl(0 72% 56%)",
  basketball: "hsl(207 72% 52%)",
  volleyball: "hsl(272 50% 55%)",
  tennis: "hsl(145 55% 42%)",
  other: "hsl(207 60% 48%)",
};

const mapSportType = (st: string): CardSport => {
  if (st === "football") return "football";
  if (st === "basketball") return "basketball";
  if (st === "volleyball") return "volleyball";
  if (st === "tennis") return "tennis";
  return "other";
};

const SkeletonCard = () => (
  <div className="rounded-[12px] overflow-hidden bg-surface-2 border border-border">
    <div className="h-[2.5px] skeleton-shimmer" />
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="h-2.5 w-20 rounded skeleton-shimmer" />
        <div className="h-2.5 w-14 rounded skeleton-shimmer" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3.5 w-3/4 rounded skeleton-shimmer" />
        <div className="h-3.5 w-2/3 rounded skeleton-shimmer" />
      </div>
    </div>
    <div className="px-3 py-2 flex items-center justify-between border-t border-border">
      <div className="h-2.5 w-16 rounded skeleton-shimmer" />
      <div className="h-4 w-12 rounded-full skeleton-shimmer" />
    </div>
  </div>
);

const LiveGameCard = ({ game }: { game: DailyGame }) => {
  const sportType = (game.sport_type || "football") as SportType;
  const cardSport = mapSportType(game.sport_type);
  const accent = SPORT_ACCENT[cardSport];
  const emoji = SPORT_EMOJI[sportType] || "🏁";
  const elapsed = getElapsedMinutes(game.game_time, game.date, sportType);
  const league = [game.competition, game.competition_detail].filter(Boolean).join(" · ");
  const channel = game.channels?.[0];

  return (
    <div className="rounded-[12px] overflow-hidden transition-all duration-300 hover:border-destructive/40 hover:-translate-y-1 hover:shadow-[0_8px_24px_hsl(0,84%,60%,0.2)] bg-surface-2 border border-border group">
      <div className="relative h-[2.5px] overflow-hidden" style={{ background: accent }}>
        <div className="absolute inset-0 -translate-x-full animate-shimmer-sweep bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </div>
      <div className="p-3 space-y-1.5">
        {/* Top row */}
        <div className="flex items-center justify-between gap-1">
          <p className="text-[9px] font-bold uppercase tracking-wider truncate text-muted-foreground font-body">
            {emoji} {league || cardSport}
          </p>
          <div className="inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-full bg-destructive/15 border border-destructive/30">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-destructive animate-pulse-live" />
              <span className="relative inline-flex rounded-full h-full w-full bg-destructive" />
            </span>
            <span className="text-[9px] font-extrabold text-destructive tabular-nums font-body">
              {elapsed !== null ? `${elapsed}'` : "LIVE"}
            </span>
          </div>
        </div>

        {/* Teams */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-extrabold text-foreground leading-tight font-body truncate">
                {game.home_team}
              </p>
            </div>
            <span className="text-[9px] font-extrabold text-destructive font-body shrink-0 px-1.5 py-0.5 rounded bg-gradient-to-br from-destructive/15 to-destructive/5 border border-destructive/25">
              VS
            </span>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[13px] font-extrabold text-foreground leading-tight font-body truncate">
                {game.away_team}
              </p>
            </div>
          </div>
          {game.is_womens && (
            <p className="text-[9px] text-muted-foreground font-body text-center">Feminino</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 flex items-center justify-between gap-1 border-t border-border bg-muted/20">
        <span className="text-[9px] text-muted-foreground font-body truncate">
          Começou {game.game_time?.slice(0, 5)}
        </span>
        {game.channels && game.channels.length > 0 && (
          <div className="flex gap-1 items-center justify-end">
            {game.channels.slice(0, 2).map((ch) => (
              <ChannelBadge key={ch} name={ch} size="sm" />
            ))}
            {game.channels.length > 2 && (
              <span className="text-[9px] text-muted-foreground/60 font-bold">
                +{game.channels.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const LiveFeedSection = () => {
  const [today, setToday] = useState(() => getLocalDateString());
  const { data: games, isLoading } = useDailyGames(today);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setToday(getLocalDateString());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const matches = useMemo(() => {
    return (games || []).filter((g) => {
      const st = (g.sport_type || "football") as SportType;
      return !isNonAdversarial(st) && isGameCurrentlyLive(g.game_time, g.date, st);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games, Math.floor(Date.now() / 60000)]);

  if (!isLoading && matches.length === 0) return null;

  return (
    <section className="space-y-3 animate-fade-up stagger-4">
      <div className="px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary animate-pulse-live" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
          <h3 className="text-[13px] sm:text-sm font-bold text-foreground font-body truncate">
            Ao Vivo <span className="text-primary">Canal do Brito</span>
          </h3>
          <span className="text-[9px] sm:text-[10px] bg-destructive/15 text-destructive rounded-full px-2 py-0.5 font-bold font-body tabular-nums shrink-0">
            {matches.length} jogos
          </span>
        </div>
        <button
          onClick={() => {
            const event = new CustomEvent("nav-tab-change", { detail: "schedule" });
            window.dispatchEvent(event);
          }}
          className="text-[10px] text-primary font-semibold font-body hover:underline shrink-0 ml-2 min-h-[44px] flex items-center"
        >
          Ver todos →
        </button>
      </div>

      <div className="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-[9px]">
        {isLoading
          ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
          : matches.map((g) => <LiveGameCard key={g.id} game={g} />)
        }
      </div>
    </section>
  );
};
