import { motion } from "framer-motion";
import type { DailyGame } from "@/hooks/useDailyGames";
import { ChannelBadgeList } from "@/components/public/ChannelBadge";
import {
  isGameCurrentlyLive,
  type SportType,
  getMinutesUntilStart,
  formatCountdown,
  getElapsedMinutes,
  isSingleEvent,
  SPORT_EMOJI,
  SPORT_LABEL,
} from "@/lib/gameUtils";
import { detectedSport } from "./highlightsCuration";
import { themeFor } from "./gamePremiumTheme";

interface Props {
  game: DailyGame;
  index: number;
  /** Mostra o esporte no card (usado na ordenação por horário). */
  showSport?: boolean;
}

export const GamePremiumCard = ({ game, index, showSport = false }: Props) => {
  const sport = detectedSport(game);
  const theme = themeFor(sport);
  const time = game.game_time.slice(0, 5);
  const live = isGameCurrentlyLive(game.game_time, game.date, sport as SportType);
  const elapsed = live ? getElapsedMinutes(game.game_time, game.date, sport as SportType) : null;
  const minutesUntil = !live ? getMinutesUntilStart(game.game_time, game.date) : null;
  const soon = minutesUntil !== null && minutesUntil <= 60;
  const ended = !live && minutesUntil === null;
  const single = isSingleEvent({ ...game, sport_type: sport });
  const channels = game.channels ?? [];
  const hasScore = !single && typeof game.home_score === "number" && typeof game.away_score === "number" && (live || ended);

  const statusLabel = live
    ? elapsed !== null ? `AO VIVO · ${elapsed}'` : "AO VIVO"
    : soon
      ? minutesUntil! < 1 ? "COMEÇANDO" : `COMEÇA EM ${formatCountdown(minutesUntil!).toUpperCase()}`
      : ended ? "ENCERRADO" : "EM BREVE";
  const statusColor = live ? "#ff3b3b" : soon ? "#fbbf24" : ended ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.6)";

  const aria = `${SPORT_LABEL[sport] ?? sport}: ${single ? game.home_team : `${game.home_team} contra ${game.away_team}`}${
    game.competition ? `, ${game.competition}` : ""
  }, às ${time}${live ? ", ao vivo" : soon ? ", começa em breve" : ended ? ", encerrado" : ""}${
    hasScore ? `, placar ${game.home_score} a ${game.away_score}` : ""
  }`;

  return (
    <motion.article
      id={`game-${game.id}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.03 }}
      className={`relative rounded-xl overflow-hidden border bg-white/[0.03] hover:bg-white/[0.06] transition-colors h-full ${
        ended ? "opacity-70" : ""
      }`}
      style={{
        borderColor: live ? "rgba(255,59,59,0.35)" : soon ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.08)",
        boxShadow: live ? "0 0 20px rgba(255,59,59,0.12)" : undefined,
      }}
      aria-label={aria}
    >
      {/* Accent bar lateral */}
      <div
        aria-hidden
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r"
        style={{
          background: live ? "#ff3b3b" : theme.accent,
          boxShadow: `0 0 10px rgba(${live ? "255,59,59" : theme.glow},0.55)`,
        }}
      />

      {/* Watermark do esporte */}
      <span
        aria-hidden
        className="absolute -right-3 -bottom-4 text-[88px] leading-none select-none pointer-events-none motion-reduce:opacity-[0.04]"
        style={{ opacity: 0.06, transform: "rotate(-12deg)" }}
      >
        {SPORT_EMOJI[sport] ?? "🏆"}
      </span>

      <div className="pl-3.5 pr-3 py-3 flex items-start gap-3">
        {/* Horário + status */}
        <div className="shrink-0 w-[68px] text-center pr-2 border-r border-white/[0.06]">
          <time
            dateTime={`${game.date}T${game.game_time}`}
            className="block text-[26px] leading-none tabular-nums"
            style={{ fontFamily: "Bebas Neue, sans-serif", color: live ? "#ff3b3b" : theme.accent }}
          >
            {time}
          </time>
          <p
            className="text-[9.5px] uppercase tracking-wider mt-1 font-bold tabular-nums leading-tight flex items-center justify-center gap-1 flex-wrap"
            style={{ color: statusColor }}
          >
            {live && <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b3b] motion-safe:animate-pulse shrink-0" aria-hidden />}
            {statusLabel}
          </p>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {showSport && (
            <p className="text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: theme.accent }}>
              {SPORT_EMOJI[sport]} {SPORT_LABEL[sport] ?? sport}
            </p>
          )}
          {single ? (
            <p className="font-semibold text-[15px] leading-snug text-white line-clamp-2">{game.home_team}</p>
          ) : (
            <p className="font-semibold text-[15px] leading-snug text-white">
              <span className="flex items-center gap-2">
                <span className="truncate flex-1 min-w-0">{game.home_team}</span>
                {hasScore && (
                  <span className={`shrink-0 tabular-nums text-[15px] font-bold ${live ? "text-[#00ff87]" : "text-white/70"}`} aria-label={`Placar ${game.home_team} ${game.home_score}`}>
                    {game.home_score}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2">
                <span className="truncate flex-1 min-w-0">
                  <span className="text-white/40 text-[12px] mr-1.5">x</span>
                  {game.away_team}
                </span>
                {hasScore && (
                  <span className={`shrink-0 tabular-nums text-[15px] font-bold ${live ? "text-[#00ff87]" : "text-white/70"}`} aria-label={`Placar ${game.away_team} ${game.away_score}`}>
                    {game.away_score}
                  </span>
                )}
              </span>
            </p>
          )}
          {game.competition && (
            <p className="text-[11.5px] text-white/55 mt-1 truncate">
              {game.competition}
              {game.competition_detail ? <span className="text-white/40"> · {game.competition_detail}</span> : null}
            </p>
          )}
          <div className="mt-2">
            {channels.length > 0 ? (
              <ChannelBadgeList channels={channels} max={2} size="sm" />
            ) : (
              <span className="inline-block text-[10px] uppercase tracking-wide text-white/50 px-2 py-1 rounded border border-dashed border-white/15">
                Canal a confirmar
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
};
