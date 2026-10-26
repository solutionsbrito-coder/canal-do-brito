import { Clock } from "lucide-react";
import type { Highlight } from "./highlightsCuration";
import { detectedSport } from "./highlightsCuration";
import { themeFor } from "./gamePremiumTheme";
import { SPORT_EMOJI, SPORT_LABEL, formatCountdown } from "@/lib/gameUtils";
import { ChannelBadge } from "@/components/public/ChannelBadge";

interface Props {
  highlights: Highlight[];
}

export const HighlightsCarousel = ({ highlights }: Props) => {
  if (highlights.length === 0) return null;

  return (
    <section className="mb-6" aria-label="Em breve">
      <div className="flex items-baseline justify-between mb-2.5">
        <h2
          className="flex items-center gap-2 text-[20px] uppercase tracking-wide"
          style={{ fontFamily: "Bebas Neue, sans-serif" }}
        >
          <Clock size={18} className="text-[#00ff87]" strokeWidth={2.5} />
          <span className="text-white">Em Breve</span>
          <span className="text-white/35 text-xs normal-case tracking-normal font-normal">
            · nas próximas horas
          </span>
        </h2>
        <span className="text-[10.5px] uppercase tracking-wider text-white/40 font-bold">
          Não perca
        </span>
      </div>

      <div
        className="-mx-4 px-4 overflow-x-auto scrollbar-none snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="flex gap-3 pb-1">
          {highlights.map(({ game, minutesUntil, priority }) => {
            const sport = detectedSport(game);
            const theme = themeFor(sport);
            const time = game.game_time.slice(0, 5);
            const isVs = !!game.away_team;
            const soon = minutesUntil <= 60;
            const isFeatured = priority === "competition" || priority === "team";

            return (
              <article
                key={game.id}
                className="snap-start shrink-0 w-[260px] rounded-2xl p-3.5 border relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, rgba(${theme.glow},0.10) 0%, rgba(13,13,13,0.92) 70%)`,
                  borderColor: `rgba(${theme.glow},0.28)`,
                  boxShadow: `0 6px 24px -10px rgba(${theme.glow},0.5)`,
                }}
              >
                {/* Watermark do esporte */}
                <span
                  aria-hidden
                  className="absolute -right-4 -bottom-6 text-[120px] leading-none select-none pointer-events-none"
                  style={{
                    opacity: 0.08,
                    filter: `drop-shadow(0 0 14px rgba(${theme.glow},0.4))`,
                    transform: "rotate(-12deg)",
                  }}
                >
                  {SPORT_EMOJI[sport] ?? "🏆"}
                </span>

                {/* Top row: esporte + countdown chip */}
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider truncate"
                    style={{ color: theme.accent }}
                  >
                    {SPORT_EMOJI[sport]} {SPORT_LABEL[sport] ?? sport}
                  </span>
                  <span
                    className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      background: soon ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.06)",
                      color: soon ? "#fbbf24" : "rgba(255,255,255,0.7)",
                      border: `1px solid ${soon ? "rgba(251,191,36,0.35)" : "rgba(255,255,255,0.10)"}`,
                    }}
                  >
                    <Clock size={10} strokeWidth={3} />
                    {formatCountdown(minutesUntil)}
                  </span>
                </div>

                {/* Horário grande */}
                <div className="flex items-baseline gap-2 mb-1.5">
                  <span
                    className="text-[28px] tabular-nums leading-none"
                    style={{ fontFamily: "Bebas Neue, sans-serif", color: theme.accent }}
                  >
                    {time}
                  </span>
                  {isFeatured && (
                    <span
                      className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: "rgba(0,255,135,0.12)",
                        color: "#00ff87",
                        border: "1px solid rgba(0,255,135,0.25)",
                      }}
                      title="Destaque do dia"
                    >
                      Destaque
                    </span>
                  )}
                </div>

                {/* Times */}
                <p className="text-white text-[15px] leading-tight font-semibold line-clamp-2 min-h-[2.4em]">
                  {isVs ? `${game.home_team} × ${game.away_team}` : game.home_team}
                </p>

                {game.competition && (
                  <p className="text-[11px] text-white/55 mt-1.5 truncate">
                    🏆 {game.competition}
                  </p>
                )}

                {game.channels && game.channels.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <ChannelBadge name={game.channels[0]} size="sm" />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
