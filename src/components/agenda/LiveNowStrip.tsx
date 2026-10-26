import { useEffect, useState, forwardRef } from "react";
import { Radio } from "lucide-react";
import { ChannelBadge } from "@/components/public/ChannelBadge";
import { SPORT_EMOJI, SPORT_LABEL, type SportType, detectSportType } from "@/lib/gameUtils";
import type { DailyGame } from "@/hooks/useDailyGames";

interface Props {
  games: DailyGame[];
  onJumpTo: (id: string) => void;
}

function elapsedMinutes(gameTime: string, date: string): number | null {
  // gameTime "HH:MM:SS", date "YYYY-MM-DD" — interpreted in America/Sao_Paulo (UTC-3)
  try {
    const [h, m] = gameTime.split(":").map(Number);
    const [y, mo, d] = date.split("-").map(Number);
    // Build UTC timestamp for the SP local time
    const startUtcMs = Date.UTC(y, mo - 1, d, h + 3, m, 0);
    const diffMs = Date.now() - startUtcMs;
    const mins = Math.floor(diffMs / 60000);
    return mins >= 0 ? mins : null;
  } catch {
    return null;
  }
}

const LiveNowStrip = forwardRef<HTMLElement, Props>(({ games, onJumpTo }, ref) => {
  const [, force] = useState(0);

  // Re-render every 30s to update minute counter and let the parent re-filter
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  if (games.length === 0) return null;

  return (
    <section
      ref={ref}
      aria-label="Jogos ao vivo agora"
      className="mb-5 rounded-2xl border border-red-500/30 bg-gradient-to-b from-red-500/[0.08] to-transparent p-3"
      style={{ boxShadow: "0 0 24px -8px rgba(239,68,68,0.35)" }}
    >
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="relative inline-flex w-2 h-2">
          <span className="motion-safe:animate-ping absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-60" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-red-500" />
        </span>
        <h2
          className="text-lg leading-none uppercase tracking-wide text-white"
          style={{ fontFamily: "Bebas Neue, sans-serif" }}
        >
          Ao vivo agora
        </h2>
        <span className="text-xs text-white/50">· {games.length}</span>
      </div>

      <div
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory -mx-1 px-1 pb-1 scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {games.map((g) => {
          const saved = (g.sport_type || "football") as SportType;
          const detected = detectSportType(`${g.competition} ${g.home_team} ${g.away_team}`);
          const sport = (detected !== "football" ? detected : saved) as SportType;
          const mins = elapsedMinutes(g.game_time, g.date);
          const minLabel =
            mins == null
              ? "AGORA"
              : sport === "football"
                ? `${Math.min(mins, 90)}'`
                : `${Math.floor(mins / 60)}h${(mins % 60).toString().padStart(2, "0")}`;
          const teams = g.away_team ? `${g.home_team} × ${g.away_team}` : g.home_team;
          return (
            <button
              key={g.id}
              onClick={() => onJumpTo(g.id)}
              className="snap-start shrink-0 w-[68%] max-w-[280px] text-left rounded-xl border border-red-500/30 bg-[#0f0708]/80 p-3 active:scale-[0.98] transition hover:border-red-500/60"
              aria-label={`${teams}, ao vivo`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400">
                  <Radio className="w-3 h-3" />
                  Ao vivo
                </span>
                <span
                  className="text-sm font-bold tabular-nums text-[#00ff87]"
                  style={{ fontFamily: "Bebas Neue, sans-serif" }}
                >
                  {minLabel}
                </span>
              </div>
              <p className="font-semibold text-[14px] leading-snug line-clamp-2 text-white">
                {teams}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/60">
                <span>{SPORT_EMOJI[sport] ?? "🏆"}</span>
                <span className="truncate">{SPORT_LABEL[sport] ?? sport}</span>
              </div>
              {g.channels && g.channels.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {g.channels.slice(0, 2).map((ch, i) => (
                    <ChannelBadge key={`${g.id}-lch-${i}`} name={ch} size="sm" />
                  ))}
                  {g.channels.length > 2 && (
                    <span className="text-[10px] text-white/50 self-center">+{g.channels.length - 2}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
});

LiveNowStrip.displayName = "LiveNowStrip";
export default LiveNowStrip;
