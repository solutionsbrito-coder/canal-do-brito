import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DailyGame } from "@/hooks/useDailyGames";
import { ChannelBadge } from "@/components/public/ChannelBadge";
import { SPORT_EMOJI, SPORT_LABEL, type SportType, getElapsedMinutes, formatScore } from "@/lib/gameUtils";
import { detectedSport } from "./highlightsCuration";
import { themeFor } from "./gamePremiumTheme";

interface Props {
  games: DailyGame[];
}

const ROTATE_MS = 5000;

export const LiveHeroCard = ({ games }: Props) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number>(Date.now());
  const rafRef = useRef<number | null>(null);

  const total = games.length;
  const hasMany = total > 1;

  // Reset quando muda a quantidade de jogos
  useEffect(() => {
    if (index >= total) setIndex(0);
  }, [total, index]);

  // Respeita prefers-reduced-motion: sem auto-rotação
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Loop de progresso + auto-advance
  useEffect(() => {
    if (!hasMany || paused || reducedMotion) {
      setProgress(0);
      return;
    }
    startRef.current = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(1, elapsed / ROTATE_MS);
      setProgress(pct);
      if (pct >= 1) {
        setIndex((i) => (i + 1) % total);
        startRef.current = Date.now();
        setProgress(0);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [hasMany, paused, reducedMotion, total, index]);

  if (total === 0) return null;
  const i = Math.min(index, total - 1);
  const game = games[i];
  const sport = detectedSport(game);
  const theme = themeFor(sport);
  const isVs = !!game.away_team;
  const elapsed = getElapsedMinutes(game.game_time, game.date, sport);
  const score = formatScore(game);

  const goPrev = () => {
    setIndex((v) => (v - 1 + total) % total);
    startRef.current = Date.now();
    setProgress(0);
  };
  const goNext = () => {
    setIndex((v) => (v + 1) % total);
    startRef.current = Date.now();
    setProgress(0);
  };
  const goTo = (idx: number) => {
    setIndex(idx);
    startRef.current = Date.now();
    setProgress(0);
  };

  return (
    <section className="mb-5" aria-label="Jogo ao vivo" aria-roledescription="carrossel">
      <div
        className="relative"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Glow vermelho ambiente */}
        <motion.div
          aria-hidden
          className="absolute -inset-1 rounded-[22px] opacity-60 blur-2xl pointer-events-none motion-reduce:hidden"
          style={{ background: "radial-gradient(60% 60% at 50% 50%, rgba(255,59,59,0.45), transparent 70%)" }}
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <AnimatePresence mode="wait">
          <motion.article
            key={game.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="relative overflow-hidden rounded-2xl border p-4 sm:p-5"
            style={{
              background: "linear-gradient(135deg, rgba(255,59,59,0.10) 0%, rgba(13,13,13,0.85) 60%, rgba(13,13,13,0.95) 100%)",
              borderColor: "rgba(255,59,59,0.32)",
              boxShadow: "0 0 30px rgba(255,59,59,0.18), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
            aria-roledescription="slide"
            aria-label={`Jogo ${i + 1} de ${total}`}
          >
            {/* Watermark do esporte */}
            <span
              aria-hidden
              className="absolute -right-4 -bottom-6 leading-none select-none pointer-events-none text-[160px]"
              style={{
                opacity: 0.06,
                filter: `drop-shadow(0 0 18px rgba(${theme.glow},0.5))`,
                transform: "rotate(-12deg)",
              }}
            >
              {SPORT_EMOJI[sport] ?? "🏆"}
            </span>

            {/* Top row: badge AO VIVO + sport + contador */}
            <div className="flex items-center justify-between mb-3 gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-[0.14em]"
                style={{ background: "#ff3b3b", color: "#0a0000" }}
                aria-label={elapsed !== null ? `Ao vivo, ${elapsed} minutos` : "Ao vivo"}
              >
                <motion.span
                  className="w-1.5 h-1.5 rounded-full bg-white"
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                AO VIVO
                {elapsed !== null ? (
                  <span className="ml-0.5 tabular-nums">· {elapsed}'</span>
                ) : null}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/60 font-medium flex items-center gap-1">
                  <span>{SPORT_EMOJI[sport] ?? "🏆"}</span>
                  <span>{SPORT_LABEL[sport] ?? sport}</span>
                </span>
                {hasMany && (
                  <span
                    className="text-[10.5px] font-bold tabular-nums px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.85)",
                      border: "1px solid rgba(255,255,255,0.10)",
                    }}
                    aria-label={`Jogo ${i + 1} de ${total}`}
                  >
                    {i + 1}/{total}
                  </span>
                )}
              </div>
            </div>

            {/* Times */}
            <div className="text-white" style={{ fontFamily: "Bebas Neue, sans-serif" }}>
              {isVs ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[26px] sm:text-[30px] leading-[0.95] flex-1 truncate">{game.home_team}</p>
                  {score ? (
                    <span className="text-[26px] sm:text-[30px] px-2 tabular-nums shrink-0" style={{ color: "#00ff87" }} aria-label={`Placar ${score}`}>
                      {score}
                    </span>
                  ) : (
                    <span className="text-[20px] text-white/40 px-2">×</span>
                  )}
                  <p className="text-[26px] sm:text-[30px] leading-[0.95] flex-1 truncate text-right">{game.away_team}</p>
                </div>
              ) : (
                <p className="text-[28px] sm:text-[32px] leading-[0.95] truncate">{game.home_team}</p>
              )}
            </div>

            {/* Meta */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {game.competition && (
                <span className="inline-flex items-center gap-1 text-[11.5px] text-white/75 font-medium">
                  <span aria-hidden>🏆</span>
                  <span className="truncate max-w-[180px]">
                    {game.competition}
                    {game.competition_detail ? ` · ${game.competition_detail}` : ""}
                  </span>
                </span>
              )}
              {(game.channels ?? []).slice(0, 2).map((ch, idx) => (
                <ChannelBadge key={`${game.id}-ch-${idx}`} name={ch} size="sm" />
              ))}
            </div>

            {/* Accent bar */}
            <div
              aria-hidden
              className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r"
              style={{ background: theme.accent, boxShadow: `0 0 12px rgba(${theme.glow},0.6)` }}
            />

            {/* Barra de progresso até trocar */}
            {hasMany && !reducedMotion && (
              <div
                aria-hidden
                className="absolute left-0 right-0 bottom-0 h-[3px] bg-white/5 overflow-hidden"
              >
                <div
                  className="h-full transition-[width] duration-100 ease-linear"
                  style={{
                    width: `${progress * 100}%`,
                    background: "#ff3b3b",
                    boxShadow: "0 0 8px rgba(255,59,59,0.6)",
                  }}
                />
              </div>
            )}
          </motion.article>
        </AnimatePresence>

        {/* Controles abaixo do card: setas + bolinhas (não sobrepõem o conteúdo) */}
        {hasMany && (
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Jogo anterior"
              className="w-9 h-9 rounded-full flex items-center justify-center border transition active:scale-90 hover:bg-white/10"
              style={{
                background: "rgba(255,255,255,0.05)",
                borderColor: "rgba(255,255,255,0.12)",
                color: "#fff",
              }}
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-1.5">
              {games.map((g, idx) => (
                <button
                  key={g.id}
                  onClick={() => goTo(idx)}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: idx === i ? 22 : 6,
                    background: idx === i ? "#ff3b3b" : "rgba(255,255,255,0.25)",
                  }}
                  aria-label={`Ir para jogo ${idx + 1}`}
                  aria-current={idx === i ? "true" : undefined}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={goNext}
              aria-label="Próximo jogo"
              className="w-9 h-9 rounded-full flex items-center justify-center border transition active:scale-90 hover:bg-white/10"
              style={{
                background: "rgba(255,255,255,0.05)",
                borderColor: "rgba(255,255,255,0.12)",
                color: "#fff",
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
