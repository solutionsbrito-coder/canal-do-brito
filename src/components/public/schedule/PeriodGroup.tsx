import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { DailyGame } from "@/hooks/useDailyGames";
import { GameCard } from "./GameCard";

export type TimeGroup = "morning" | "afternoon" | "night" | "dawn";

export const GROUP_META: Record<TimeGroup, { label: string; emoji: string }> = {
  morning: { label: "Manhã", emoji: "🌅" },
  afternoon: { label: "Tarde", emoji: "☀️" },
  night: { label: "Noite", emoji: "🌙" },
  dawn: { label: "Madrugada", emoji: "🌃" },
};

export const GROUP_ORDER: TimeGroup[] = ["morning", "afternoon", "night", "dawn"];

export function getTimeGroup(time: string): TimeGroup {
  const h = parseInt(time.split(":")[0], 10);
  if (h < 6) return "dawn";
  if (h < 13) return "morning";
  if (h < 18) return "afternoon";
  return "night";
}

interface PeriodGroupProps {
  group: TimeGroup;
  games: DailyGame[];
  onPushReminder?: (gameId: string, add: boolean) => void;
  defaultOpen?: boolean;
}

export const PeriodGroup = ({ group, games, onPushReminder, defaultOpen = true }: PeriodGroupProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const meta = GROUP_META[group];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className="flex items-center gap-3 w-full py-1 min-h-[44px]"
          aria-label={`${meta.label}, ${games.length} jogos. ${open ? "Recolher" : "Expandir"}`}
        >
          <span className="text-base" aria-hidden>{meta.emoji}</span>
          <span className="text-xs font-bold text-foreground/70 uppercase tracking-widest">
            {meta.label}
          </span>
          <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5 tabular-nums">
            {games.length}
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-border/40 to-transparent" />
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground/40 transition-transform duration-200 ${
              open ? "" : "-rotate-90"
            }`}
            aria-hidden
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div
          className="grid gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-2.5 sm:mt-3"
          role="list"
          aria-label={`Jogos do período ${meta.label}`}
        >
          {games.map((game, idx) => (
            <GameCard key={game.id} game={game} index={idx} onPushReminder={onPushReminder} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
