import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Calendar, Sparkles, ChevronRight } from "lucide-react";
import { useAllDailyGames, type DailyGame } from "@/hooks/useDailyGames";
import { useLiveTick } from "@/hooks/useLiveTick";
import { useRealtimeDailyGames } from "@/hooks/useRealtimeDailyGames";
import {
  isGameCurrentlyLive,
  getLocalDateString,
  getElapsedMinutes,
  SPORT_EMOJI,
  SPORT_LABEL,
  isNonAdversarial,
  type SportType,
} from "@/lib/gameUtils";
import { ChannelBadgeList } from "./ChannelBadge";
import { getSportTheme, isHighlightCompetition } from "./schedule/GameCardSportTheme";
import { cn } from "@/lib/utils";

/* ─────────── helpers ─────────── */

const isEventLike = (g: DailyGame) => {
  const st = (g.sport_type || "football") as SportType;
  return isNonAdversarial(st) || !g.away_team || g.away_team === g.home_team;
};

const sortLive = (a: DailyGame, b: DailyGame): number => {
  const aH = isHighlightCompetition(a.competition || "") ? 1 : 0;
  const bH = isHighlightCompetition(b.competition || "") ? 1 : 0;
  if (aH !== bH) return bH - aH;
  const stA = (a.sport_type || "football") as SportType;
  const stB = (b.sport_type || "football") as SportType;
  const ea = getElapsedMinutes(a.game_time, a.date, stA) ?? 0;
  const eb = getElapsedMinutes(b.game_time, b.date, stB) ?? 0;
  return eb - ea;
};

/* ─────────── Live Clock ─────────── */
const LiveClock = () => {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }),
  );
  useEffect(() => {
    const id = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        }),
      );
    }, 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="text-[12px] font-semibold tabular-nums text-[hsl(var(--live-text-muted))]">
      {time}
    </span>
  );
};

/* ─────────── Header (compact, inline) ─────────── */
const LiveHeader = ({ count }: { count: number }) => (
  <header className="px-4 pt-4 pb-3 flex items-center justify-between">
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        <span className="absolute inline-flex h-full w-full rounded-full bg-destructive motion-safe:animate-ping opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
      </span>
      <h1
        className="text-[20px] leading-none uppercase tracking-[0.04em] text-foreground"
        style={{ fontFamily: "Bebas Neue, sans-serif" }}
      >
        Ao Vivo
      </h1>
      <span className="text-[12px] text-[hsl(var(--live-text-muted))] tabular-nums truncate">
        · {count} {count === 1 ? "jogo agora" : "jogos agora"}
      </span>
    </div>
    <LiveClock />
  </header>
);

/* ─────────── Hero Card (jogo principal) ─────────── */
const LiveHeroCard = ({ game }: { game: DailyGame }) => {
  const sportType = (game.sport_type || "football") as SportType;
  const elapsed = getElapsedMinutes(game.game_time, game.date, sportType);
  const theme = getSportTheme(sportType);
  const emoji = SPORT_EMOJI[sportType] || "⚽";
  const sportLabel = SPORT_LABEL[sportType] || "Esporte";
  const event = isEventLike(game);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="relative mx-4 rounded-2xl overflow-hidden"
      style={{
        background: "hsl(var(--live-card))",
        boxShadow:
          "0 0 0 1px hsl(0 0% 100% / 0.04), 0 12px 40px -16px hsl(var(--live) / 0.18)",
      }}
      aria-label={`Ao vivo: ${game.home_team}${game.away_team ? " contra " + game.away_team : ""}`}
    >
      {/* sport accent bar */}
      <span
        aria-hidden
        className="absolute left-0 top-4 bottom-4 w-[2px] rounded-r"
        style={{ background: theme.color, opacity: 0.7 }}
      />

      {/* sport watermark */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-2 -bottom-4 text-[88px] sm:text-[112px] leading-none select-none"
        style={{
          opacity: 0.035,
          color: theme.color,
          transform: "rotate(-8deg)",
        }}
      >
        {emoji}
      </span>

      {/* sport color glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 sm:w-48 sm:h-48 rounded-full"
        style={{
          background: `radial-gradient(circle, ${theme.color} 0%, transparent 70%)`,
          opacity: 0.06,
        }}
      />

      <div className="relative px-5 pt-4 pb-5">
        {/* meta */}
        <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.18em] text-[hsl(var(--live-text-muted))] mb-4">
          <span aria-hidden>{emoji}</span>
          <span className="font-bold text-foreground/80">{sportLabel}</span>
          {game.competition && (
            <>
              <span className="opacity-40">·</span>
              <span className="truncate">{game.competition}</span>
            </>
          )}
        </div>

        {/* teams */}
        {event ? (
          <div className="text-center mb-3">
            <p
              className="text-[26px] sm:text-[30px] leading-none text-foreground"
              style={{ fontFamily: "Bebas Neue, sans-serif" }}
            >
              {game.home_team}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-3">
            <p
              className="text-[24px] sm:text-[28px] leading-none text-foreground truncate text-right"
              style={{ fontFamily: "Bebas Neue, sans-serif" }}
              title={game.home_team}
            >
              {game.home_team}
            </p>
            <span className="text-[20px] text-[hsl(var(--live-text-muted))] leading-none">
              —
            </span>
            <p
              className="text-[24px] sm:text-[28px] leading-none text-foreground truncate"
              style={{ fontFamily: "Bebas Neue, sans-serif" }}
              title={game.away_team ?? ""}
            >
              {game.away_team}
            </p>
          </div>
        )}

        {/* minute */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="h-px w-8 bg-destructive/40" aria-hidden />
          <span className="inline-flex items-baseline gap-1.5">
            <span
              className="text-[18px] leading-none text-destructive tabular-nums"
              style={{ fontFamily: "Bebas Neue, sans-serif" }}
            >
              {elapsed !== null ? `${elapsed}'` : ""}
            </span>
            <span className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-destructive">
              ao vivo
            </span>
          </span>
          <span className="h-px w-8 bg-destructive/40" aria-hidden />
        </div>

        {/* channels */}
        {game.channels && game.channels.length > 0 && (
          <ChannelBadgeList channels={game.channels} max={3} size="sm" className="justify-center" />
        )}
      </div>
    </motion.article>
  );
};

/* ─────────── Sport Filter Bar ─────────── */
type FilterId = "all" | SportType;
const SportFilterBar = ({
  active,
  onChange,
  counts,
  total,
}: {
  active: FilterId;
  onChange: (f: FilterId) => void;
  counts: Partial<Record<SportType, number>>;
  total: number;
}) => {
  const sports = (Object.keys(counts) as SportType[]).filter((s) => (counts[s] ?? 0) > 0);
  if (sports.length < 2) return null;
  const items: { id: FilterId; label: string; count: number; emoji?: string }[] = [
    { id: "all", label: "Todos", count: total },
    ...sports.map((s) => ({
      id: s,
      label: SPORT_LABEL[s] ?? s,
      count: counts[s] ?? 0,
      emoji: SPORT_EMOJI[s],
    })),
  ];

  return (
    <div className="px-4">
      <div
        className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1"
        role="tablist"
        aria-label="Filtrar por esporte"
      >
        {items.map((it) => {
          const isActive = active === it.id;
          return (
            <button
              key={it.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(it.id)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[12px] font-semibold transition-colors",
                isActive
                  ? "bg-white/[0.08] text-primary"
                  : "bg-transparent text-[hsl(var(--live-text-muted))] hover:text-foreground",
              )}
            >
              {it.emoji && <span aria-hidden>{it.emoji}</span>}
              <span>{it.label}</span>
              <span
                className={cn(
                  "tabular-nums text-[10.5px] font-bold opacity-70",
                  isActive && "text-primary opacity-100",
                )}
              >
                {it.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────── Live Game Row (compacta, escaneável) ─────────── */
const LiveGameRow = ({ game }: { game: DailyGame }) => {
  const sportType = (game.sport_type || "football") as SportType;
  const elapsed = getElapsedMinutes(game.game_time, game.date, sportType);
  const theme = getSportTheme(sportType);
  const emoji = SPORT_EMOJI[sportType] || "⚽";
  const event = isEventLike(game);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="relative px-4 py-3 transition-colors hover:bg-white/[0.02] overflow-hidden"
    >
      {/* sport accent */}
      <span
        aria-hidden
        className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r"
        style={{ background: theme.color, opacity: 0.35 }}
      />

      {/* sport watermark */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-1 top-1/2 text-[40px] sm:text-[52px] leading-none select-none"
        style={{
          opacity: 0.025,
          color: theme.color,
          transform: "translateY(-50%) rotate(-6deg)",
        }}
      >
        {emoji}
      </span>

      {/* meta line */}
      <div className="flex items-center justify-between gap-3 mb-2 text-[10.5px] uppercase tracking-[0.14em] text-[hsl(var(--live-text-muted))]">
        <span className="truncate min-w-0">
          <span aria-hidden className="mr-1">
            {emoji}
          </span>
          <span className="font-semibold">{game.competition || SPORT_LABEL[sportType]}</span>
        </span>
        {game.channels && game.channels.length > 0 && (
          <span className="shrink-0 normal-case tracking-normal text-[11px] text-foreground/70 truncate max-w-[55%]">
            {game.channels.slice(0, 2).join(" · ")}
            {game.channels.length > 2 && ` +${game.channels.length - 2}`}
          </span>
        )}
      </div>

      {/* main line: home — minute — away */}
      {event ? (
        <div className="flex items-center justify-between gap-3">
          <p className="flex-1 text-[15px] font-semibold text-foreground truncate min-w-0">
            {game.home_team}
          </p>
          <MinutePill elapsed={elapsed} />
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <p
            className="text-[15px] font-semibold text-foreground text-right truncate min-w-0"
            title={game.home_team}
          >
            {game.home_team}
          </p>
          <MinutePill elapsed={elapsed} />
          <p
            className="text-[15px] font-semibold text-foreground truncate min-w-0"
            title={game.away_team ?? ""}
          >
            {game.away_team}
          </p>
        </div>
      )}
    </motion.article>
  );
};

const MinutePill = ({ elapsed }: { elapsed: number | null }) => (
  <span
    className="shrink-0 inline-flex items-center justify-center min-w-[44px] h-7 px-2 rounded-md tabular-nums text-[15px] text-destructive"
    style={{
      fontFamily: "Bebas Neue, sans-serif",
      background: "hsl(var(--live) / 0.10)",
    }}
    aria-label={elapsed !== null ? `${elapsed} minutos` : "ao vivo"}
  >
    {elapsed !== null ? `${elapsed}'` : "AO VIVO"}
  </span>
);

/* ─────────── Upcoming Mini Row ─────────── */
const UpcomingMiniRow = ({ game, minutesUntil }: { game: DailyGame; minutesUntil: number }) => {
  const event = isEventLike(game);
  const matchup = event
    ? game.home_team
    : `${game.home_team} × ${game.away_team}`;
  const channel = game.channels?.[0];
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 min-h-[44px] hover:bg-white/[0.02] transition-colors">
      <span
        className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground/90"
        style={{ fontFamily: "Bebas Neue, sans-serif" }}
      >
        {game.game_time?.slice(0, 5)}
      </span>
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary tabular-nums">
        em {minutesUntil}m
      </span>
      <p className="flex-1 text-[13px] text-foreground/85 truncate min-w-0">{matchup}</p>
      {channel && (
        <span className="shrink-0 text-[11px] text-[hsl(var(--live-text-muted))] truncate max-w-[35%]">
          {channel}
        </span>
      )}
    </div>
  );
};

/* ─────────── Premium CTA (rodapé, único) ─────────── */
const PremiumCTA = () => (
  <Link
    to="/assinar?from=ao-vivo-bottom"
    className="group mx-4 mt-2 block rounded-2xl overflow-hidden relative active:scale-[0.99] transition-transform"
    style={{
      background: "hsl(var(--live-card))",
      boxShadow:
        "0 0 0 1px hsl(var(--primary) / 0.18), 0 12px 32px -18px hsl(var(--primary) / 0.35)",
    }}
    aria-label="Assinar Canal do Brito"
  >
    <div className="relative flex items-center gap-3 p-4">
      <div
        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: "hsl(var(--primary) / 0.12)" }}
      >
        <Sparkles className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] uppercase tracking-[0.16em] text-[hsl(var(--live-text-muted))] font-semibold">
          Ainda não é assinante?
        </p>
        <p
          className="text-[16px] leading-tight text-foreground mt-0.5"
          style={{ fontFamily: "Bebas Neue, sans-serif" }}
        >
          Assista a tudo por <span className="text-primary">R$ 35/mês</span>
        </p>
      </div>
      <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary group-hover:translate-x-0.5 transition-transform">
        Assinar
        <ChevronRight className="w-3.5 h-3.5" />
      </span>
    </div>
  </Link>
);

/* ─────────── Empty State ─────────── */
const EmptyLive = () => (
  <div className="mx-4 rounded-2xl p-6 text-center" style={{ background: "hsl(var(--live-card))" }}>
    <div
      className="mx-auto w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
      style={{ background: "hsl(0 0% 100% / 0.04)" }}
    >
      <Radio className="h-5 w-5 text-[hsl(var(--live-text-muted))]" />
    </div>
    <h3
      className="text-[18px] uppercase tracking-wide text-foreground mb-1"
      style={{ fontFamily: "Bebas Neue, sans-serif" }}
    >
      Sem jogos ao vivo agora
    </h3>
    <p className="text-[12px] text-[hsl(var(--live-text-muted))] mb-4">
      Veja a programação para os próximos eventos.
    </p>
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(new CustomEvent("nav-tab-change", { detail: "schedule" }))
      }
      className="inline-flex items-center gap-1.5 px-4 h-11 rounded-xl bg-primary text-primary-foreground text-[12px] font-bold hover:brightness-110 transition-all"
    >
      <Calendar className="h-4 w-4" />
      Ver programação
    </button>
  </div>
);

/* ─────────── Main ─────────── */
export const LivePageContent = () => {
  useRealtimeDailyGames();
  const tick = useLiveTick();
  const today = useMemo(() => getLocalDateString(), [tick]);
  const { data: games, isLoading } = useAllDailyGames(today);
  const [filter, setFilter] = useState<FilterId>("all");

  const all = useMemo(
    () => (games || []).filter((g) => !g.archived && g.active),
    [games],
  );

  const liveGames = useMemo(() => {
    return all
      .filter((g) =>
        isGameCurrentlyLive(g.game_time, g.date, (g.sport_type || "football") as SportType),
      )
      .sort(sortLive);
  }, [all, tick]);

  const counts = useMemo(() => {
    const out: Partial<Record<SportType, number>> = {};
    for (const g of liveGames) {
      const s = (g.sport_type || "football") as SportType;
      out[s] = (out[s] ?? 0) + 1;
    }
    return out;
  }, [liveGames]);

  const filteredLive = useMemo(
    () =>
      filter === "all"
        ? liveGames
        : liveGames.filter((g) => (g.sport_type || "football") === filter),
    [liveGames, filter],
  );

  const upcoming = useMemo(() => {
    const now = new Date();
    const liveKeys = new Set(
      liveGames.map(
        (g) =>
          `${(g.competition || "").toLowerCase().trim()}|${(g.home_team || "").toLowerCase().trim()}`,
      ),
    );
    return all
      .map((g) => {
        const [h, m] = (g.game_time || "00:00").split(":").map(Number);
        const start = new Date(
          `${g.date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00-03:00`,
        );
        const diffMin = Math.round((start.getTime() - now.getTime()) / 60_000);
        return { g, diffMin };
      })
      .filter(({ g, diffMin }) => {
        if (diffMin <= 0 || diffMin > 60) return false;
        const key = `${(g.competition || "").toLowerCase().trim()}|${(g.home_team || "").toLowerCase().trim()}`;
        return !liveKeys.has(key);
      })
      .sort((a, b) => a.diffMin - b.diffMin)
      .slice(0, 5);
  }, [all, liveGames, tick]);

  const hero = filteredLive[0];
  const restLive = filteredLive.slice(1);

  return (
    <div
      className="min-h-[80vh] pb-[calc(2rem+env(safe-area-inset-bottom))] relative"
      style={{ background: "hsl(var(--live-bg))" }}
    >
      {/* Ambient glow atrás do hero — extremamente sutil */}
      {hero && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[280px] pointer-events-none"
          style={{
            background:
              "radial-gradient(60% 80% at 50% 30%, hsl(var(--live) / 0.06), transparent 70%)",
          }}
        />
      )}

      <div className="relative">
        <LiveHeader count={liveGames.length} />

        {/* Loading */}
        {isLoading && (
          <div className="px-4 space-y-3">
            <div className="h-[180px] rounded-2xl skeleton-shimmer" />
            <div className="h-[80px] rounded-xl skeleton-shimmer" />
            <div className="h-[80px] rounded-xl skeleton-shimmer" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && liveGames.length === 0 && (
          <>
            <EmptyLive />
            <div className="mt-5">
              <PremiumCTA />
            </div>
          </>
        )}

        {/* Hero */}
        {!isLoading && hero && (
          <section className="mb-4">
            <AnimatePresence mode="wait">
              <LiveHeroCard key={hero.id} game={hero} />
            </AnimatePresence>
          </section>
        )}

        {/* Filtros */}
        {!isLoading && liveGames.length > 0 && (
          <div className="mb-3">
            <SportFilterBar
              active={filter}
              onChange={setFilter}
              counts={counts}
              total={liveGames.length}
            />
          </div>
        )}

        {/* Lista live */}
        {!isLoading && restLive.length > 0 && (
          <section className="mb-4 divide-y divide-white/[0.04]">
            <AnimatePresence mode="popLayout">
              {restLive.map((g) => (
                <LiveGameRow key={g.id} game={g} />
              ))}
            </AnimatePresence>
          </section>
        )}

        {/* Estado: filtro vazio mas tem live em outro esporte */}
        {!isLoading && liveGames.length > 0 && filteredLive.length === 0 && (
          <div className="mx-4 mb-4 px-4 py-5 rounded-xl text-center text-[12px] text-[hsl(var(--live-text-muted))]"
               style={{ background: "hsl(var(--live-card))" }}>
            Nenhum jogo desse esporte ao vivo agora.
          </div>
        )}

        {/* Em breve */}
        {!isLoading && upcoming.length > 0 && (
          <section className="mb-4">
            <div className="px-4 mb-2 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.16em] text-[hsl(var(--live-text-muted))]">
              <span className="font-bold text-foreground/80">Em breve</span>
              <span className="opacity-50">·</span>
              <span className="normal-case tracking-normal text-[11px]">
                próximo em <span className="text-primary font-bold tabular-nums">{upcoming[0].diffMin}min</span>
              </span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {upcoming.map(({ g, diffMin }) => (
                <UpcomingMiniRow key={g.id} game={g} minutesUntil={diffMin} />
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        {!isLoading && liveGames.length > 0 && (
          <div className="mt-6">
            <PremiumCTA />
          </div>
        )}

        {/* Aviso sutil */}
        {!isLoading && (
          <p className="mt-4 px-6 text-center text-[10.5px] text-[hsl(var(--live-text-muted))] leading-relaxed">
            Canais e horários podem sofrer alterações de última hora sem aviso prévio.
          </p>
        )}
      </div>
    </div>
  );
};

export default LivePageContent;
