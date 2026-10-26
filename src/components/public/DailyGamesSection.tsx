import { useMemo, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarOff, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useDailyGames, type DailyGame } from "@/hooks/useDailyGames";
import { useLiveTick } from "@/hooks/useLiveTick";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import {
  isGameCurrentlyLive,
  getLocalDateString,
  getTomorrowDateString,
  type SportType,
} from "@/lib/gameUtils";
import { NextGameHero } from "./NextGameHero";
import { ScheduleHeader } from "./schedule/ScheduleHeader";
import { ScheduleFilters, type FilterCategory } from "./schedule/ScheduleFilters";
import { PeriodGroup, GROUP_ORDER, getTimeGroup, type TimeGroup } from "./schedule/PeriodGroup";
import { TomorrowSection } from "./schedule/TomorrowSection";
import { EmptyFilterState } from "./schedule/EmptyFilterState";

const isLive = (g: DailyGame) =>
  isGameCurrentlyLive(g.game_time, g.date, (g.sport_type || "football") as SportType);

export const DailyGamesSection = () => {
  const tick = useLiveTick();
  const today = useMemo(() => getLocalDateString(), [tick]);
  const tomorrow = useMemo(() => getTomorrowDateString(), [tick]);
  const { data: games, isLoading } = useDailyGames(today);
  const { data: tomorrowGames } = useDailyGames(tomorrow);

  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [compFilter, setCompFilter] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const [openFilter, setOpenFilter] = useState<FilterCategory | null>(null);

  const { addGameReminder, removeGameReminder, isSupported: pushSupported } = usePushSubscription();
  const handlePushReminder = useCallback(
    async (gameId: string, add: boolean) => {
      if (!pushSupported) return;
      if (add) {
        const ok = await addGameReminder(gameId);
        if (ok) toast.success("Você será notificado 15min antes!");
      } else {
        await removeGameReminder(gameId);
      }
    },
    [addGameReminder, removeGameReminder, pushSupported]
  );

  /* Dynamic filter options */
  const { availableSports, availableComps, availableChannels } = useMemo(() => {
    const all = games || [];
    const sports = new Set(all.map((g) => (g.sport_type || "football") as SportType));
    const compMap: Record<string, number> = {};
    const channelMap: Record<string, number> = {};
    all.forEach((g) => {
      compMap[g.competition.trim()] = (compMap[g.competition.trim()] || 0) + 1;
      g.channels?.forEach((ch) => {
        const k = ch.trim();
        channelMap[k] = (channelMap[k] || 0) + 1;
      });
    });
    return {
      availableSports: Array.from(sports),
      availableComps: Object.entries(compMap).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count })),
      availableChannels: Object.entries(channelMap).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count })),
    };
  }, [games]);

  const filteredGames = useMemo(() => {
    let r = games || [];
    if (sportFilter) r = r.filter((g) => (g.sport_type || "football") === sportFilter);
    if (channelFilter) r = r.filter((g) => g.channels?.some((ch) => ch.toLowerCase().includes(channelFilter.toLowerCase())));
    if (compFilter) r = r.filter((g) => g.competition.toLowerCase().includes(compFilter.toLowerCase()));
    return r;
  }, [games, sportFilter, compFilter, channelFilter]);

  const grouped = useMemo(() => {
    const g: Record<TimeGroup, DailyGame[]> = { morning: [], afternoon: [], night: [], dawn: [] };
    filteredGames.forEach((x) => g[getTimeGroup(x.game_time || "00:00")].push(x));
    return g;
  }, [filteredGames]);

  const hasActiveFilters = !!sportFilter || !!compFilter || !!channelFilter;
  const toggleFilter = (cat: FilterCategory) => setOpenFilter((p) => (p === cat ? null : cat));
  const clearAll = () => {
    setSportFilter(null);
    setCompFilter(null);
    setChannelFilter(null);
    setOpenFilter(null);
  };

  /* ── Loading skeleton ── */
  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl skeleton-shimmer" />
          <div className="h-5 w-32 rounded skeleton-shimmer" />
          <div className="h-5 w-16 rounded-full skeleton-shimmer" />
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-border/20 bg-card/60">
              <div className="h-7 skeleton-shimmer" />
              <div className="p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-24 rounded skeleton-shimmer" />
                  <div className="h-3 w-12 rounded skeleton-shimmer" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-1/3 rounded skeleton-shimmer" />
                  <div className="h-7 w-16 rounded-lg skeleton-shimmer" />
                  <div className="h-4 w-1/3 rounded skeleton-shimmer ml-auto" />
                </div>
                <div className="flex gap-1">
                  <div className="h-5 w-14 rounded-lg skeleton-shimmer" />
                  <div className="h-5 w-14 rounded-lg skeleton-shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  /* ── Day-empty state ── */
  if (!games || games.length === 0) {
    return (
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-foreground tracking-tight">Programação</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <div className="p-4 rounded-2xl bg-muted/20 border border-border/20">
            <CalendarOff className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground/60">
            Nenhum jogo programado para {format(new Date(today + "T12:00:00"), "EEEE, d 'de' MMM", { locale: ptBR })}
          </p>
          <p className="text-xs text-muted-foreground/40">Confira os destaques da semana enquanto isso</p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("nav-tab-change", { detail: "novidades" }))}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/15 transition-all min-h-[44px]"
          >
            ⭐ Ver destaques
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      id="esportes"
      className="space-y-4 w-full min-w-0 overflow-hidden"
      aria-label="Programação de jogos do dia"
    >
      <ScheduleHeader games={games} filteredCount={filteredGames.length} todayDate={today} />

      <NextGameHero games={[...games, ...(tomorrowGames || [])]} />

      <ScheduleFilters
        availableSports={availableSports}
        availableComps={availableComps}
        availableChannels={availableChannels}
        sportFilter={sportFilter}
        compFilter={compFilter}
        channelFilter={channelFilter}
        openFilter={openFilter}
        onToggleFilter={toggleFilter}
        onSportFilter={(v) => { setSportFilter(v); setOpenFilter(null); }}
        onCompFilter={(v) => { setCompFilter(v); setOpenFilter(null); }}
        onChannelFilter={(v) => { setChannelFilter(v); setOpenFilter(null); }}
        onClearAll={clearAll}
      />

      <div className="space-y-5">
        {GROUP_ORDER.map((group) => {
          const g = grouped[group];
          if (!g || g.length === 0) return null;
          return <PeriodGroup key={group} group={group} games={g} onPushReminder={handlePushReminder} />;
        })}
      </div>

      {tomorrowGames && tomorrowGames.length > 0 && !hasActiveFilters && (
        <TomorrowSection games={tomorrowGames} onPushReminder={handlePushReminder} />
      )}

      <AnimatePresence>
        {filteredGames.length === 0 && hasActiveFilters && (
          <EmptyFilterState
            description={
              `Nenhum jogo${channelFilter ? ` em ${channelFilter}` : ""}${compFilter ? ` de ${compFilter}` : ""}${sportFilter ? ` de ${sportFilter}` : ""}.`
            }
            onClear={clearAll}
          />
        )}
      </AnimatePresence>

      {/* Live count helper for screen readers (kept silent visually) */}
      <span className="sr-only" aria-live="polite">
        {games.filter(isLive).length} jogos ao vivo agora
      </span>
    </section>
  );
};
