import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Trophy } from "lucide-react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { NextGameHero } from "@/components/public/NextGameHero";
import { GameCard } from "@/components/public/schedule/GameCard";
import { PremiumCTA } from "@/components/public/cinema/PremiumCTA";
import { useAllDailyGames, type DailyGame } from "@/hooks/useDailyGames";
import { useRealtimeDailyGames } from "@/hooks/useRealtimeDailyGames";
import { useLiveTick } from "@/hooks/useLiveTick";
import {
  getLocalDateString,
  isGameCurrentlyLive,
  SPORT_EMOJI,
  SPORT_LABEL,
  type SportType,
} from "@/lib/gameUtils";
import { offsetDateStr } from "@/lib/whatsappText";

type DateKey = "today" | "tomorrow";

const SchedulePage = () => {
  useRealtimeDailyGames();
  useLiveTick();

  const today = getLocalDateString();
  const tomorrow = offsetDateStr(today, 1);
  const [dateKey, setDateKey] = useState<DateKey>("today");
  const [sportFilter, setSportFilter] = useState<SportType | "all">("all");

  const activeDate = dateKey === "today" ? today : tomorrow;
  const { data: todayGames = [], isLoading } = useAllDailyGames(today);
  const { data: tomorrowGames = [] } = useAllDailyGames(tomorrow);

  const games = (dateKey === "today" ? todayGames : tomorrowGames).filter(
    (g) => g.active && !g.archived,
  );

  const { liveCount, sportChips } = useMemo(() => {
    const counts: Record<string, number> = {};
    let live = 0;
    for (const g of games) {
      const st = (g.sport_type || "football") as SportType;
      counts[st] = (counts[st] || 0) + 1;
      if (isGameCurrentlyLive(g.game_time, g.date, st)) live++;
    }
    const chips = (Object.entries(counts) as [SportType, number][]).sort(
      (a, b) => b[1] - a[1],
    );
    return { liveCount: live, sportChips: chips };
  }, [games]);

  const visibleGames = useMemo(() => {
    const list =
      sportFilter === "all"
        ? games
        : games.filter((g) => (g.sport_type || "football") === sportFilter);
    return [...list].sort((a, b) => a.game_time.localeCompare(b.game_time));
  }, [games, sportFilter]);

  const humanDate = format(new Date(activeDate + "T12:00:00"), "EEEE, d 'de' MMMM", {
    locale: ptBR,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      <main className="flex-1 w-full max-w-3xl mx-auto px-3 sm:px-5 pt-4 pb-16 space-y-5">
        {/* Page title */}
        <section className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <Trophy className="h-4 w-4 text-primary" aria-hidden />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl tracking-wide text-foreground">
              AGENDA ESPORTIVA
            </h1>
          </div>
          <p className="text-[12px] text-muted-foreground capitalize">{humanDate}</p>
        </section>

        {/* Next game hero */}
        {dateKey === "today" && games.length > 0 && <NextGameHero games={games} />}

        {/* Date tabs */}
        <div
          role="tablist"
          aria-label="Selecionar data"
          className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-card/50 border border-border/20 backdrop-blur"
        >
          <DateTab
            active={dateKey === "today"}
            onClick={() => setDateKey("today")}
            label="Hoje"
            sub={format(new Date(today + "T12:00:00"), "d MMM", { locale: ptBR })}
            count={todayGames.length}
            liveCount={liveCount}
          />
          <DateTab
            active={dateKey === "tomorrow"}
            onClick={() => setDateKey("tomorrow")}
            label="Amanhã"
            sub={format(new Date(tomorrow + "T12:00:00"), "d MMM", { locale: ptBR })}
            count={tomorrowGames.length}
          />
        </div>

        {/* Sport filter chips */}
        {sportChips.length > 0 && (
          <div
            data-horizontal-scroll
            className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-0.5"
            role="toolbar"
            aria-label="Filtro por esporte"
          >
            <SportChip
              active={sportFilter === "all"}
              onClick={() => setSportFilter("all")}
              label={`Todos · ${games.length}`}
            />
            {sportChips.map(([st, count]) => (
              <SportChip
                key={st}
                active={sportFilter === st}
                onClick={() => setSportFilter(sportFilter === st ? "all" : st)}
                label={`${SPORT_EMOJI[st] || "⚽"} ${SPORT_LABEL[st] || st} · ${count}`}
              />
            ))}
          </div>
        )}

        {/* Games list */}
        <section aria-live="polite" className="space-y-3">
          {isLoading ? (
            <SkeletonList />
          ) : visibleGames.length === 0 ? (
            <EmptyState date={activeDate} filtered={sportFilter !== "all"} />
          ) : (
            <AnimatePresence mode="popLayout">
              {visibleGames.map((g, i) => (
                <motion.div
                  key={g.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <GameCard game={g as DailyGame} index={i} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </section>

        <PremiumCTA />
      </main>

      <PublicFooter />
    </div>
  );
};

const DateTab = ({
  active,
  onClick,
  label,
  sub,
  count,
  liveCount,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  count: number;
  liveCount?: number;
}) => (
  <button
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={`relative min-h-[52px] rounded-xl px-3 py-2 flex flex-col items-start justify-center transition-all border ${
      active
        ? "bg-primary/15 border-primary/40 text-primary shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
        : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-card/40"
    }`}
  >
    <div className="flex items-center gap-1.5">
      <CalendarDays className="h-3.5 w-3.5" aria-hidden />
      <span className="font-display text-base tracking-wide">{label}</span>
      {!!liveCount && liveCount > 0 && (
        <span className="ml-1 inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive border border-destructive/30 motion-safe:animate-pulse">
          <span className="w-1 h-1 rounded-full bg-destructive" />
          {liveCount}
        </span>
      )}
    </div>
    <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
      <span className="capitalize opacity-70">{sub}</span>
      <span className="opacity-30">·</span>
      <span className="tabular-nums opacity-70">{count} jogos</span>
    </div>
  </button>
);

const SportChip = ({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`shrink-0 min-h-11 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all border whitespace-nowrap ${
      active
        ? "bg-primary/15 border-primary/40 text-primary"
        : "bg-card/40 border-border/20 text-muted-foreground hover:text-foreground hover:border-border/40"
    }`}
  >
    {label}
  </button>
);

const SkeletonList = () => (
  <div className="space-y-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="h-[132px] rounded-2xl bg-card/40 border border-border/10 relative overflow-hidden"
      >
        <div className="absolute inset-0 shimmer" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ date, filtered }: { date: string; filtered: boolean }) => (
  <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border/25 bg-card/30">
    <div className="text-4xl mb-2" aria-hidden>
      📅
    </div>
    <p className="font-display text-lg tracking-wide text-foreground">
      {filtered ? "Nenhum jogo com esse filtro" : "Sem jogos por aqui"}
    </p>
    <p className="text-[11px] text-muted-foreground mt-1">
      {filtered
        ? "Tente outro esporte ou volte ao filtro Todos."
        : `Ainda não há programação publicada para ${date}.`}
    </p>
  </div>
);

export default SchedulePage;
