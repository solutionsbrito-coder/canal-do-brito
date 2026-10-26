import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { SPORT_EMOJI, SPORT_LABEL, type SportType } from "@/lib/gameUtils";

export type FilterCategory = "sport" | "comp" | "channel";

interface ScheduleFiltersProps {
  availableSports: SportType[];
  availableComps: { label: string; count: number }[];
  availableChannels: { label: string; count: number }[];
  sportFilter: string | null;
  compFilter: string | null;
  channelFilter: string | null;
  openFilter: FilterCategory | null;
  onToggleFilter: (cat: FilterCategory) => void;
  onSportFilter: (s: string | null) => void;
  onCompFilter: (c: string | null) => void;
  onChannelFilter: (c: string | null) => void;
  onClearAll: () => void;
}

const baseBtn = "shrink-0 flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-xl text-[11px] font-bold transition-all border";
const inactiveBtn = "bg-card/50 backdrop-blur border-border/20 text-muted-foreground hover:text-foreground hover:border-border/40";
const activeBtn = "bg-primary/15 text-primary border-primary/30";

const pillBase = "shrink-0 px-3 py-2 min-h-[44px] rounded-lg text-[10px] font-bold transition-all";
const pillActive = "bg-primary/15 text-primary border border-primary/30";
const pillInactive = "bg-card/40 border border-border/15 text-muted-foreground hover:text-foreground";

export const ScheduleFilters = ({
  availableSports,
  availableComps,
  availableChannels,
  sportFilter,
  compFilter,
  channelFilter,
  openFilter,
  onToggleFilter,
  onSportFilter,
  onCompFilter,
  onChannelFilter,
  onClearAll,
}: ScheduleFiltersProps) => {
  const hasActiveFilters = !!sportFilter || !!compFilter || !!channelFilter;

  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (sportFilter)
    activeChips.push({
      key: "sport",
      label: `${SPORT_EMOJI[sportFilter as SportType] || "⚽"} ${SPORT_LABEL[sportFilter as SportType] || sportFilter}`,
      onRemove: () => onSportFilter(null),
    });
  if (compFilter) activeChips.push({ key: "comp", label: `🏆 ${compFilter}`, onRemove: () => onCompFilter(null) });
  if (channelFilter) activeChips.push({ key: "channel", label: `📺 ${channelFilter}`, onRemove: () => onChannelFilter(null) });

  return (
    <div className="space-y-2">
      <div
        data-horizontal-scroll
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-0.5"
        role="toolbar"
        aria-label="Filtros de jogos"
      >
        {availableSports.length > 1 && (
          <button
            onClick={() => onToggleFilter("sport")}
            aria-expanded={openFilter === "sport"}
            aria-label={sportFilter ? `Filtro: ${SPORT_LABEL[sportFilter as SportType]}` : "Filtrar por esporte"}
            className={`${baseBtn} ${openFilter === "sport" || sportFilter ? activeBtn : inactiveBtn}`}
          >
            {sportFilter ? `${SPORT_EMOJI[sportFilter as SportType]} ${SPORT_LABEL[sportFilter as SportType]}` : "Esporte"}
            <ChevronDown className={`h-3 w-3 transition-transform ${openFilter === "sport" ? "rotate-180" : ""}`} />
          </button>
        )}
        {availableComps.length > 1 && (
          <button
            onClick={() => onToggleFilter("comp")}
            aria-expanded={openFilter === "comp"}
            aria-label={compFilter ? `Filtro: ${compFilter}` : "Filtrar por competição"}
            className={`${baseBtn} ${openFilter === "comp" || compFilter ? activeBtn : inactiveBtn}`}
          >
            <span className="truncate max-w-[140px]">{compFilter || "Competição"}</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${openFilter === "comp" ? "rotate-180" : ""}`} />
          </button>
        )}
        {availableChannels.length > 1 && (
          <button
            onClick={() => onToggleFilter("channel")}
            aria-expanded={openFilter === "channel"}
            aria-label={channelFilter ? `Filtro: ${channelFilter}` : "Filtrar por canal"}
            className={`${baseBtn} ${openFilter === "channel" || channelFilter ? activeBtn : inactiveBtn}`}
          >
            {channelFilter ? `📺 ${channelFilter}` : "Canal"}
            <ChevronDown className={`h-3 w-3 transition-transform ${openFilter === "channel" ? "rotate-180" : ""}`} />
          </button>
        )}
        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="shrink-0 p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all border border-destructive/20"
            aria-label="Limpar todos os filtros"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {openFilter === "sport" && availableSports.length > 1 && (
          <motion.div key="sport-pills" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div data-horizontal-scroll className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
              <button onClick={() => onSportFilter(null)} className={`${pillBase} ${!sportFilter ? pillActive : pillInactive}`}>
                Todos
              </button>
              {availableSports.map((st) => (
                <button
                  key={st}
                  onClick={() => onSportFilter(sportFilter === st ? null : st)}
                  className={`${pillBase} ${sportFilter === st ? pillActive : pillInactive}`}
                >
                  {SPORT_EMOJI[st]} {SPORT_LABEL[st]}
                </button>
              ))}
            </div>
          </motion.div>
        )}
        {openFilter === "comp" && availableComps.length > 1 && (
          <motion.div key="comp-pills" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div data-horizontal-scroll className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
              <button onClick={() => onCompFilter(null)} className={`${pillBase} ${!compFilter ? pillActive : pillInactive}`}>
                Todas
              </button>
              {availableComps.map((c) => (
                <button
                  key={c.label}
                  onClick={() => onCompFilter(compFilter === c.label ? null : c.label)}
                  className={`${pillBase} ${compFilter === c.label ? pillActive : pillInactive} flex items-center gap-1`}
                >
                  <span className="truncate max-w-[160px]">{c.label}</span>
                  <span className="text-[8px] opacity-50 tabular-nums">{c.count}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
        {openFilter === "channel" && availableChannels.length > 1 && (
          <motion.div key="channel-pills" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div data-horizontal-scroll className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
              <button onClick={() => onChannelFilter(null)} className={`${pillBase} ${!channelFilter ? pillActive : pillInactive}`}>
                Todos
              </button>
              {availableChannels.map((ch) => (
                <button
                  key={ch.label}
                  onClick={() => onChannelFilter(channelFilter === ch.label ? null : ch.label)}
                  className={`${pillBase} ${channelFilter === ch.label ? pillActive : pillInactive} flex items-center gap-1`}
                >
                  <span className="truncate max-w-[140px]">{ch.label}</span>
                  <span className="text-[8px] opacity-50 tabular-nums">{ch.count}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeChips.length > 0 && openFilter === null && (
        <div className="flex gap-1.5 flex-wrap">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              onClick={chip.onRemove}
              className="flex items-center gap-1 text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 rounded-lg px-2 py-1 hover:bg-primary/20 transition-all"
              aria-label={`Remover filtro ${chip.label}`}
            >
              {chip.label}
              <X className="h-2.5 w-2.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
