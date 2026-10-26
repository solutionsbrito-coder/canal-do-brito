import { motion } from "framer-motion";
import { SPORT_EMOJI, SPORT_LABEL, type SportType } from "@/lib/gameUtils";

export type FilterValue = "all" | "live" | SportType;

interface Chip {
  value: FilterValue;
  label: string;
  emoji: string;
  count: number;
}

interface Props {
  active: FilterValue;
  onChange: (v: FilterValue) => void;
  totalCount: number;
  liveCount: number;
  countsBySport: Partial<Record<SportType, number>>;
  sportOrder: SportType[];
}

export const SportFilterBar = ({
  active,
  onChange,
  totalCount,
  liveCount,
  countsBySport,
  sportOrder,
}: Props) => {
  const chips: Chip[] = [
    { value: "all", label: "Todos", emoji: "✨", count: totalCount },
  ];
  if (liveCount > 0) {
    chips.push({ value: "live", label: "Ao Vivo", emoji: "🔴", count: liveCount });
  }
  for (const s of sportOrder) {
    chips.push({
      value: s,
      label: SPORT_LABEL[s] ?? s,
      emoji: SPORT_EMOJI[s] ?? "🏆",
      count: countsBySport[s] ?? 0,
    });
  }

  return (
    <div
      className="-mx-4 px-4 mb-5 overflow-x-auto scrollbar-none"
      style={{ scrollbarWidth: "none" }}
      role="toolbar"
      aria-label="Filtrar por esporte"
    >
      <div className="flex gap-2 min-w-min">
        {chips.map((c) => {
          const isActive = c.value === active;
          return (
            <button
              key={c.value}
              type="button"
              aria-pressed={isActive}
              aria-label={`${c.label}, ${c.count} ${c.count === 1 ? "jogo" : "jogos"}`}
              onClick={() => onChange(isActive && c.value !== "all" ? "all" : c.value)}
              className="relative shrink-0 h-11 px-3.5 inline-flex items-center gap-1.5 rounded-full text-[13px] font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60"
              style={{
                color: isActive ? "#07080a" : "#fff",
                background: isActive ? "transparent" : "rgba(255,255,255,0.05)",
                border: `1px solid ${isActive ? "transparent" : "rgba(255,255,255,0.10)"}`,
              }}
            >
              {isActive && (
                <motion.span
                  layoutId="filter-pill"
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: c.value === "live" ? "#ff3b3b" : "#00ff87",
                    boxShadow:
                      c.value === "live"
                        ? "0 0 18px rgba(255,59,59,0.45)"
                        : "0 0 18px rgba(0,255,135,0.35)",
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">{c.emoji}</span>
              <span className="relative whitespace-nowrap">{c.label}</span>
              <span
                className="relative text-[10.5px] px-1.5 rounded-full font-bold"
                style={{
                  background: isActive ? "rgba(7,8,10,0.18)" : "rgba(255,255,255,0.10)",
                  color: isActive ? "#07080a" : "#fff",
                }}
              >
                {c.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
