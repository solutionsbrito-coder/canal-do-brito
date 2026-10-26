import type { DailyGame } from "@/hooks/useDailyGames";
import { SPORT_EMOJI, SPORT_LABEL, type SportType } from "@/lib/gameUtils";
import { GamePremiumCard } from "./GamePremiumCard";

interface Props {
  sport: SportType | string;
  games: DailyGame[];
}

export const SportSection = ({ sport, games }: Props) => {
  if (games.length === 0) return null;
  return (
    <section className="mb-6">
      <h2
        className="flex items-baseline gap-2 text-[20px] uppercase tracking-wide mb-2.5"
        style={{ fontFamily: "Bebas Neue, sans-serif" }}
      >
        <span className="text-[22px] leading-none">{SPORT_EMOJI[sport as SportType] ?? "🏆"}</span>
        <span className="text-white">{SPORT_LABEL[sport as SportType] ?? sport}</span>
        <span className="text-white/35 text-xs normal-case tracking-normal font-normal">
          · {games.length} {games.length === 1 ? "jogo" : "jogos"}
        </span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {games.map((g, i) => (
          <GamePremiumCard key={g.id} game={g} index={i} />
        ))}
      </div>
    </section>
  );
};
