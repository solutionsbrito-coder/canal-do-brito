import { useMemo, useState } from "react";
import { ChevronDown, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { DailyGame } from "@/hooks/useDailyGames";
import { PeriodGroup, GROUP_ORDER, getTimeGroup, type TimeGroup } from "./PeriodGroup";

interface TomorrowSectionProps {
  games: DailyGame[];
  onPushReminder?: (gameId: string, add: boolean) => void;
}

const PERIOD_META: Record<TimeGroup, { emoji: string; label: string }> = {
  morning: { emoji: "🌅", label: "Manhã" },
  afternoon: { emoji: "☀️", label: "Tarde" },
  night: { emoji: "🌙", label: "Noite" },
  dawn: { emoji: "🌌", label: "Madrugada" },
};

export const TomorrowSection = ({ games, onPushReminder }: TomorrowSectionProps) => {
  const [open, setOpen] = useState(false);

  const tomorrowStr = useMemo(() => {
    if (!games[0]) return "";
    try {
      return format(new Date(games[0].date + "T12:00:00"), "EEE, d 'de' MMM", { locale: ptBR });
    } catch {
      return games[0].date;
    }
  }, [games]);

  const grouped = useMemo(() => {
    const groups: Record<TimeGroup, DailyGame[]> = { morning: [], afternoon: [], night: [], dawn: [] };
    games.forEach((g) => groups[getTimeGroup(g.game_time || "00:00")].push(g));
    return groups;
  }, [games]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          aria-label={`Mostrar jogos de amanhã, ${games.length} ${games.length === 1 ? "jogo" : "jogos"}`}
          className="group relative w-full overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent backdrop-blur-xl text-left min-h-[44px] transition-colors hover:border-accent/40"
        >
          {/* Glow orb */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent" />

          <div className="relative flex items-center gap-3 px-3 py-2.5">
            <div className="shrink-0 flex items-center justify-center h-10 w-10 rounded-xl bg-accent/15 border border-accent/30 shadow-[0_0_16px_hsl(var(--accent)/0.25)]">
              <CalendarClock className="h-5 w-5 text-accent" aria-hidden />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[13px] font-extrabold text-foreground uppercase tracking-[0.14em] leading-none">
                  Amanhã
                </h3>
                <span className="inline-flex items-center justify-center min-w-[22px] h-[18px] px-1.5 rounded-full bg-accent text-accent-foreground text-[10px] font-extrabold tabular-nums shadow-[0_0_10px_hsl(var(--accent)/0.5)]">
                  {games.length}
                </span>
                <span className="text-[10px] font-semibold text-foreground/70 capitalize bg-card/40 border border-border/40 rounded-full px-2 py-0.5">
                  {tomorrowStr}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[10px] font-bold text-foreground/70 tabular-nums">
                {GROUP_ORDER.map((g) =>
                  grouped[g].length > 0 ? (
                    <span key={g} className="inline-flex items-center gap-1">
                      <span aria-hidden>{PERIOD_META[g].emoji}</span>
                      <span>{grouped[g].length}</span>
                      <span className="text-foreground/40 font-medium">{PERIOD_META[g].label}</span>
                    </span>
                  ) : null
                )}
              </div>
            </div>

            <ChevronDown
              className={`shrink-0 h-4 w-4 text-foreground/60 transition-transform duration-300 ${
                open ? "rotate-0" : "-rotate-90"
              }`}
              aria-hidden
            />
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-5 mt-3">
          {GROUP_ORDER.map((group) => {
            const g = grouped[group];
            if (!g || g.length === 0) return null;
            return <PeriodGroup key={group} group={group} games={g} onPushReminder={onPushReminder} defaultOpen={false} />;
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
