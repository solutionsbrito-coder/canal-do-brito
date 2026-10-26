import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAllDailyGames, type DailyGame } from "@/hooks/useDailyGames";
import {
  isGameCurrentlyLive,
  getLocalDateString,
  getElapsedMinutes,
  SPORT_EMOJI,
  SPORT_LABEL,
  isNonAdversarial,
  type SportType,
} from "@/lib/gameUtils";
import { ChannelBadge } from "./ChannelBadge";
import { useLiveTick } from "@/hooks/useLiveTick";

/* ── Framer-motion variants ── */
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 400, damping: 28, mass: 0.8 },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.9 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2, ease: "easeOut" as const },
  },
};

/* ── Sport accent colors (left bar) ── */
const SPORT_ACCENT: Record<string, string> = {
  football: "bg-destructive",
  basketball: "bg-blue-500",
  volleyball: "bg-purple-500",
  tennis: "bg-emerald-500",
  f1: "bg-amber-500",
  mma: "bg-orange-500",
  hockey: "bg-sky-500",
  baseball: "bg-yellow-600",
  rugby: "bg-green-600",
  surf: "bg-cyan-500",
  cycling: "bg-pink-500",
  boxing: "bg-red-600",
  swimming: "bg-teal-500",
  golf: "bg-lime-600",
};

/* ── Sport badge background colors (inline style) ── */
const SPORT_BADGE_BG: Record<string, string> = {
  football: "#e53e3e",
  basketball: "#3b82f6",
  volleyball: "#8b5cf6",
  tennis: "#10b981",
  f1: "#f59e0b",
  mma: "#f97316",
  hockey: "#0ea5e9",
  baseball: "#ca8a04",
  rugby: "#16a34a",
  surf: "#06b6d4",
  cycling: "#ec4899",
  boxing: "#dc2626",
  swimming: "#14b8a6",
  golf: "#65a30d",
};

const INITIAL_VISIBLE = 6;

/* ── Match card (adversarial) ── */
const MatchCard = React.forwardRef<HTMLDivElement, { game: DailyGame }>(
  ({ game }, ref) => {
    const sportType = (game.sport_type || "football") as SportType;
    const elapsed = getElapsedMinutes(game.game_time, game.date, sportType);
    const emoji = SPORT_EMOJI[sportType] || "⚽";
    const channel = game.channels?.[0];
    const accent = SPORT_ACCENT[game.sport_type] || "bg-destructive";
    const league = [game.competition, game.competition_detail].filter(Boolean).join(" · ");

    return (
      <div
        ref={ref}
        className="rounded-2xl overflow-hidden bg-surface-2 border border-border/60 transition-colors duration-300 hover:border-destructive/30"
      >
        <div className="flex">
          <div className={`w-[3px] ${accent}`} />
          <div className="flex-1 min-w-0">
            <div className="px-2.5 pt-2 pb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wide shrink-0"
                  style={{ backgroundColor: SPORT_BADGE_BG[sportType] || "#e53e3e" }}
                >
                  {emoji} {SPORT_LABEL[sportType] || "Futebol"}
                </span>
                <p className="text-[9px] font-bold uppercase tracking-wider truncate text-muted-foreground font-body">
                  {league}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-destructive animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                </span>
                <span className="text-[10px] font-bold text-destructive tabular-nums font-body">
                  {elapsed !== null ? `${elapsed}'` : "AO VIVO"}
                </span>
              </div>
            </div>
            <div className="px-2.5 pb-1.5 space-y-1">
              <div className="space-y-0.5 text-center">
                <p className="text-[13px] font-bold text-foreground leading-tight font-body line-clamp-2">
                  {game.home_team}
                </p>
                <p className="text-[9px] text-muted-foreground font-body text-center">VS</p>
                <p className="text-[13px] font-bold text-foreground leading-tight font-body line-clamp-2">
                  {game.away_team}
                </p>
              </div>
              {game.is_womens && (
                <p className="text-[9px] text-muted-foreground font-body text-center">Feminino</p>
              )}
            </div>
            <div className="px-2.5 py-1.5 flex items-center justify-between gap-2 border-t border-border/40">
              <span className="text-[9px] text-muted-foreground font-body tabular-nums">
                Começou {game.game_time?.slice(0, 5)}
              </span>
              {channel && <ChannelBadge name={channel} />}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
MatchCard.displayName = "MatchCard";

const MotionMatchCard = motion.create(MatchCard);

/* ── Event card (non-adversarial) ── */
const EventCard = React.forwardRef<HTMLDivElement, { event: DailyGame }>(
  ({ event }, ref) => {
    const sportType = (event.sport_type || "f1") as SportType;
    const elapsed = getElapsedMinutes(event.game_time, event.date, sportType);
    const emoji = SPORT_EMOJI[sportType] || "🏁";
    const channel = event.channels?.[0];
    const accent = SPORT_ACCENT[event.sport_type] || "bg-amber-500";

    return (
      <div
        ref={ref}
        className="rounded-xl overflow-hidden bg-surface-2 border border-border/60 transition-colors duration-200 hover:border-amber-500/30"
      >
        <div className="flex">
          <div className={`w-[3px] ${accent}`} />
          <div className="flex-1 min-w-0 p-2.5 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <span
                className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wide shrink-0"
                style={{ backgroundColor: SPORT_BADGE_BG[sportType] || "#f59e0b" }}
              >
                {emoji} {SPORT_LABEL[sportType] || "Esporte"}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                </span>
                <span className="text-[9px] font-bold text-amber-500 tabular-nums font-body">
                  {elapsed !== null ? `${elapsed}'` : "AO VIVO"}
                </span>
              </div>
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider truncate font-body">
              {event.competition}
            </p>
            <p className="text-[13px] font-bold text-foreground leading-tight font-body line-clamp-2 text-center">
              {event.home_team}
            </p>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] text-muted-foreground font-body tabular-nums">
                {event.game_time?.slice(0, 5)}
              </span>
              {channel && <ChannelBadge name={channel} />}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
EventCard.displayName = "EventCard";

const MotionEventCard = motion.create(EventCard);

/* ── Clock display ── */
const LiveClock = () => {
  const [time, setTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  });

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="text-[10px] text-muted-foreground font-body tabular-nums">{time}</span>
  );
};

/* ── Main component ── */
export const LiveNowHero = () => {
  const tick = useLiveTick();
  const today = useMemo(() => getLocalDateString(), [tick]);
  const { data: allGames, isLoading } = useAllDailyGames(today);
  const [expanded, setExpanded] = useState(false);

  const { matches, events } = useMemo(() => {
    const all = (allGames || []).filter((g) => !g.archived && g.active);
    const m: DailyGame[] = [];
    const e: DailyGame[] = [];
    for (const g of all) {
      const st = (g.sport_type || "football") as SportType;
      if (!isGameCurrentlyLive(g.game_time, g.date, st)) continue;
      if (isNonAdversarial(st)) e.push(g);
      else m.push(g);
    }
    return { matches: m, events: e };
  }, [allGames, tick]);

  const totalLive = matches.length + events.length;

  if (!isLoading && totalLive === 0) {
    return (
      <section className="mx-3 rounded-2xl bg-surface-2 border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted/50">
            <span className="text-lg">📺</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground font-body">Nenhum jogo ao vivo agora</p>
            <p className="text-[10px] text-muted-foreground font-body">Confira a programação completa do dia</p>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("nav-tab-change", { detail: "schedule" }))}
            className="text-[10px] text-primary font-semibold font-body hover:underline min-h-[44px] flex items-center shrink-0"
          >
            Ver programação →
          </button>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="mx-3 rounded-2xl bg-surface-2 border border-border p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full skeleton-shimmer" />
          <div className="h-4 w-32 rounded skeleton-shimmer" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-[100px] rounded-2xl skeleton-shimmer" />
          ))}
        </div>
      </section>
    );
  }

  const visibleMatches = expanded ? matches : matches.slice(0, INITIAL_VISIBLE);
  const visibleEvents = expanded ? events : events.slice(0, Math.max(0, INITIAL_VISIBLE - matches.length));
  const hasMore = totalLive > INITIAL_VISIBLE && !expanded;

  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={totalLive > 0 ? "live" : "empty"}
        className="mx-3 rounded-2xl overflow-hidden relative"
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Pulsing red border glow */}
        <div className="absolute inset-0 rounded-2xl border border-destructive/30 animate-pulse pointer-events-none z-10" />
        
        {/* Background */}
        <div className="bg-gradient-to-br from-destructive/[0.06] via-surface-2 to-surface-2 rounded-2xl p-3 space-y-3">
          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-destructive animate-ping" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
              </span>
              <h3 className="text-xs sm:text-sm font-black text-foreground font-body tracking-tight uppercase">
                Ao Vivo Agora
              </h3>
              <span className="text-[10px] bg-destructive/20 text-destructive rounded-full px-2 py-0.5 font-bold font-body tabular-nums shrink-0">
                {totalLive} {totalLive === 1 ? "jogo" : "jogos"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <LiveClock />
              <button
                onClick={() => {
                  console.log('[LiveNow:view-all]', true);
                  window.dispatchEvent(new CustomEvent("nav-tab-change", { detail: "schedule" }));
                }}
                aria-label="Ver todos os jogos ao vivo na programação"
                className="text-[10px] text-primary font-semibold font-body hover:underline min-h-[44px] flex items-center"
              >
                Ver todos →
              </button>
            </div>
          </div>

          {/* Match grid (vertical) */}
          {visibleMatches.length > 0 && (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {visibleMatches.map((g) => (
                <MotionMatchCard key={g.id} game={g} variants={cardVariants} />
              ))}
            </motion.div>
          )}

          {/* Events grid */}
          {visibleEvents.length > 0 && (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {visibleEvents.map((e) => (
                <MotionEventCard key={e.id} event={e} variants={cardVariants} />
              ))}
            </motion.div>
          )}

          {/* Show more button */}
          {hasMore && (
            <button
              onClick={() => setExpanded(true)}
              aria-label={`Expandir e ver todos os ${totalLive} jogos ao vivo`}
              className="w-full text-center text-[11px] font-semibold text-primary font-body py-2 rounded-xl border border-border/60 bg-surface hover:bg-surface-2 transition-colors min-h-[44px]"
            >
              Ver todos os {totalLive} jogos
            </button>
          )}
        </div>
      </motion.section>
    </AnimatePresence>
  );
};
