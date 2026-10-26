import { useMemo } from "react";
import type { DailyGame } from "@/hooks/useDailyGames";
import type { GameStatus } from "@/lib/gameUtils";
import { getMinutesUntilStart } from "@/lib/gameUtils";
import { GamePremiumCard } from "./GamePremiumCard";

interface Props {
  games: DailyGame[];
  /** Status calculado por jogo (quando ausente, agrupa por período do dia). */
  statusById?: Map<string, GameStatus>;
}

type Group = { key: string; label: string; emoji: string; hint?: string; games: DailyGame[] };

function periodOf(time: string): { key: string; label: string; emoji: string } {
  const h = parseInt(time.slice(0, 2), 10);
  if (h < 6) return { key: "madrugada", label: "Madrugada", emoji: "🌙" };
  if (h < 12) return { key: "manha", label: "Manhã", emoji: "🌅" };
  if (h < 18) return { key: "tarde", label: "Tarde", emoji: "☀️" };
  return { key: "noite", label: "Noite", emoji: "🌃" };
}

const SOON_WINDOW_MIN = 180;

/** Faixa por status: Agora → Próximos (até 3h) → Mais tarde → Encerrados. */
function bucketOf(g: DailyGame, status: GameStatus): { key: string; label: string; emoji: string; hint?: string } {
  if (status === "live") return { key: "now", label: "Agora", emoji: "🔴", hint: "ao vivo" };
  if (status === "ended") return { key: "ended", label: "Encerrados", emoji: "🏁" };
  const mins = getMinutesUntilStart(g.game_time, g.date) ?? 0;
  if (mins <= SOON_WINDOW_MIN) return { key: "next", label: "Próximos", emoji: "⏱️", hint: "nas próximas 3h" };
  return { key: "later", label: "Mais tarde", emoji: "🕒" };
}

const BUCKET_ORDER = ["now", "next", "later", "ended"];

/** Lista cronológica: ao vivo primeiro, depois do mais próximo ao mais distante. */
export const TimeSection = ({ games, statusById }: Props) => {
  const groups = useMemo(() => {
    const out: Group[] = [];
    for (const g of games) {
      const status = statusById?.get(g.id);
      const b = status ? bucketOf(g, status) : periodOf(g.game_time);
      let grp = out.find((x) => x.key === b.key);
      if (!grp) {
        grp = { ...b, games: [] };
        out.push(grp);
      }
      grp.games.push(g);
    }
    for (const grp of out) grp.games.sort((a, b) => a.game_time.localeCompare(b.game_time));
    if (statusById) out.sort((a, b) => BUCKET_ORDER.indexOf(a.key) - BUCKET_ORDER.indexOf(b.key));
    return out;
  }, [games, statusById]);

  if (games.length === 0) return null;

  return (
    <>
      {groups.map((grp) => (
        <section key={grp.key} className="mb-6" aria-label={grp.label}>
          <h2
            className="flex items-baseline gap-2 text-[20px] uppercase tracking-wide mb-2.5"
            style={{ fontFamily: "Bebas Neue, sans-serif" }}
          >
            <span className="text-[22px] leading-none" aria-hidden>{grp.emoji}</span>
            <span className={grp.key === "now" ? "text-[#ff3b3b]" : grp.key === "ended" ? "text-white/60" : "text-white"}>
              {grp.label}
            </span>
            <span className="text-white/45 text-xs normal-case tracking-normal font-normal">
              · {grp.games.length} {grp.games.length === 1 ? "jogo" : "jogos"}
              {grp.hint ? ` · ${grp.hint}` : ""}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {grp.games.map((g, i) => (
              <GamePremiumCard key={g.id} game={g} index={i} showSport />
            ))}
          </div>
        </section>
      ))}
    </>
  );
};
