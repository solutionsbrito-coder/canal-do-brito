import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, Info, Play, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { CinemaItem } from "./useCinemaShelves";

interface CinemaHeroProps {
  items: CinemaItem[];
  trailerAvailable: Map<number, boolean>;
  onPlayTrailer: (item: CinemaItem) => void;
  onOpenDetails: (item: CinemaItem) => void;
  /** Pausa a rotação automática (ex.: detalhe ou trailer aberto). */
  pausedExternally?: boolean;
}

const AUTO_ROTATE_MS = 7000;
const SWIPE_THRESHOLD = 60;

const getBadgeLabel = (badge?: string) => {
  if (badge === "lancamento") return "🆕 Lançamento";
  if (badge === "estreia") return "⭐ Estreia";
  if (badge === "exclusivo") return "👑 Exclusivo";
  if (badge === "nova_temporada") return "🎞️ Nova Temporada";
  return "🔥 Em Destaque";
};

const getTypeLabel = (t?: string) => {
  if (t === "movie") return "Filme";
  if (t === "series" || t === "tv") return "Série";
  return null;
};

export const CinemaHero = forwardRef<HTMLElement, CinemaHeroProps>(
  ({ items, trailerAvailable, onPlayTrailer, onOpenDetails, pausedExternally = false }, ref) => {
    const reduce = useReducedMotion();
    const [index, setIndex] = useState(0);
    const [hoverPaused, setPaused] = useState(false);
    const paused = hoverPaused || pausedExternally;
    const total = items.length;

    useEffect(() => { setIndex(0); }, [total]);

    const goTo = useCallback((next: number) => {
      if (total === 0) return;
      setIndex(((next % total) + total) % total);
    }, [total]);

    const next = useCallback(() => goTo(index + 1), [goTo, index]);
    const prev = useCallback(() => goTo(index - 1), [goTo, index]);

    useEffect(() => {
      if (reduce || total <= 1 || paused) return;
      const id = window.setInterval(() => {
        setIndex((i) => (i + 1) % total);
      }, AUTO_ROTATE_MS);
      return () => window.clearInterval(id);
    }, [reduce, total, paused]);

    // Keyboard arrows
    useEffect(() => {
      if (total <= 1) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight") next();
        else if (e.key === "ArrowLeft") prev();
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [next, prev, total]);

    const safeIdx = total > 0 ? Math.min(index, total - 1) : 0;
    const current = items[safeIdx];

    const hasTrailer = useMemo(() => {
      if (!current?.tmdb_id) return false;
      return trailerAvailable.get(current.tmdb_id) === true;
    }, [current, trailerAvailable]);

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (Math.abs(info.offset.x) < SWIPE_THRESHOLD) return;
      if (info.offset.x < 0) next();
      else prev();
    };

    // Pré-carrega o backdrop do PRÓXIMO slide para o crossfade não piscar.
    useEffect(() => {
      if (total <= 1) return;
      const nextItem = items[(safeIdx + 1) % total];
      const url = nextItem?.backdrop_url || nextItem?.poster_url;
      if (!url) return;
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    }, [items, safeIdx, total]);

    if (!current) {
      return (
        <section
          ref={ref}
          aria-label="Destaques"
          className="relative h-[58vh] min-h-[420px] sm:h-[68vh] flex items-end overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.18),transparent_55%)]" />
          <div className="relative z-10 px-5 pb-10 space-y-3 max-w-xl">
            <Sparkles className="w-7 h-7 text-primary" />
            <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-foreground">
              EM BREVE NOVOS LANÇAMENTOS
            </h1>
            <p className="text-sm text-muted-foreground font-body max-w-md">
              Estamos preparando estreias e séries exclusivas. Assine agora e seja o primeiro a assistir.
            </p>
            <Link
              to="/assinar"
              className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-full bg-primary text-primary-foreground font-semibold font-body shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)] hover:opacity-95 transition-opacity"
            >
              Assinar agora
            </Link>
          </div>
        </section>
      );
    }

    const ratingNum = current.rating ? Number(current.rating) : null;
    const typeLabel = getTypeLabel(current.content_type);
    const bgUrl = current.backdrop_url || current.poster_url || "";
    const showControls = total > 1;

    return (
      <section
        ref={ref}
        aria-roledescription="carousel"
        aria-label="Destaques cinematográficos"
        className="relative h-[62vh] min-h-[460px] sm:h-[70vh] overflow-hidden group/hero"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {/* Progress bar (top) — mostra que o slide vai trocar sozinho */}
        {showControls && !reduce && (
          <div className="absolute top-0 inset-x-0 z-20 h-[3px] bg-foreground/10">
            <motion.div
              key={`progress-${safeIdx}-${paused ? "p" : "r"}`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: paused ? 0 : 1 }}
              transition={{ duration: paused ? 0 : AUTO_ROTATE_MS / 1000, ease: "linear" }}
              style={{ transformOrigin: "left" }}
              className="h-full bg-primary"
            />
          </div>
        )}

        {/* Backdrop crossfade + swipe area */}
        <AnimatePresence mode="sync">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 1.2, ease: "easeOut" }}
            className="absolute inset-0"
            drag={showControls ? "x" : false}
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
          >
            {bgUrl ? (
              <img
                src={bgUrl}
                alt=""
                aria-hidden
                fetchPriority="high"
                decoding="async"
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover select-none"
              />
            ) : (
              <div className="absolute inset-0 bg-surface-2" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/20 to-transparent" />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/70 to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* (Setas movidas para a barra inferior — evitam sobrepor a arte) */}

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-end px-5 pb-7 sm:pb-10 sm:px-10 max-w-3xl pointer-events-none">
          <motion.div
            key={`txt-${current.id}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: reduce ? 0 : 0.5, ease: "easeOut" }}
            className="space-y-3 pointer-events-auto"
            aria-live="polite"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/30 px-2.5 py-1 text-[11px] font-semibold text-primary backdrop-blur-md">
                {getBadgeLabel(current.badge_type)}
              </span>
              {ratingNum !== null && ratingNum > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-background/60 border border-border/40 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur-md">
                  <Star className="w-3 h-3 fill-primary text-primary" />
                  <span className="tabular-nums">{ratingNum.toFixed(1)} IMDb</span>
                </span>
              )}
              {typeLabel && (
                <span className="inline-flex items-center rounded-full bg-background/60 border border-border/40 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground backdrop-blur-md">
                  {typeLabel}
                </span>
              )}
            </div>

            <h1 className="font-display text-4xl sm:text-6xl leading-[0.95] tracking-wide text-foreground">
              {current.title}
            </h1>

            {current.overview && (
              <p className="text-sm sm:text-base text-foreground/80 font-body line-clamp-2 max-w-xl">
                {current.overview}
              </p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => (hasTrailer ? onPlayTrailer(current) : onOpenDetails(current))}
                aria-label={hasTrailer ? "Assistir trailer" : "Ver detalhes"}
                className={cn(
                  "inline-flex items-center gap-2 min-h-[48px] px-5 rounded-full",
                  "bg-primary text-primary-foreground font-semibold font-body",
                  "shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.55)]",
                  "hover:opacity-95 active:scale-[0.98] transition-all"
                )}
              >
                {hasTrailer ? <Play className="w-4 h-4 fill-current" /> : <Info className="w-4 h-4" />}
                {hasTrailer ? "Assistir Trailer" : "Ver Detalhes"}
              </button>
              {hasTrailer && (
                <button
                  type="button"
                  onClick={() => onOpenDetails(current)}
                  aria-label="Mais informações"
                  className="inline-flex items-center gap-2 min-h-[48px] px-5 rounded-full bg-background/40 border border-border/50 text-foreground font-semibold font-body backdrop-blur-md hover:bg-background/60 transition-colors"
                >
                  <Info className="w-4 h-4" />
                  Detalhes
                </button>
              )}
            </div>
          </motion.div>

          {/* Barra de controle: indicadores + contador (esquerda) e setas (direita) */}
          {showControls && (
            <div className="mt-5 flex items-center justify-between gap-3 pointer-events-auto">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1.5" role="tablist" aria-label="Slides de destaques">
                  {items.map((it, i) => (
                    <button
                      key={it.id}
                      role="tab"
                      type="button"
                      aria-selected={i === safeIdx}
                      aria-label={`Ir para destaque ${i + 1} de ${total}${items[i]?.title ? `: ${items[i].title}` : ""}`}
                      onClick={() => goTo(i)}
                      className={cn(
                        "relative py-3 -my-3 group/dot rounded-full",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      )}
                    >
                      <span
                        className={cn(
                          "block h-1.5 rounded-full transition-all",
                          i === safeIdx
                            ? "w-10 bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.6)]"
                            : "w-5 bg-foreground/30 group-hover/dot:bg-foreground/60"
                        )}
                      />
                    </button>
                  ))}
                </div>
                <span
                  className="text-[11px] font-body tabular-nums text-muted-foreground"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {safeIdx + 1} <span className="text-foreground/40">/</span> {total}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={prev}
                  aria-label={`Destaque anterior (${((safeIdx - 1 + total) % total) + 1} de ${total})`}
                  aria-controls="cinema-hero-slide"
                  className={cn(
                    "inline-flex items-center justify-center w-11 h-11 rounded-full",
                    "bg-background/65 backdrop-blur-md border border-border/60 text-foreground",
                    "hover:bg-background/90 hover:border-primary/50 active:scale-95 transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  )}
                >
                  <ChevronLeft className="w-5 h-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label={`Próximo destaque (${(safeIdx + 1) % total + 1} de ${total})`}
                  aria-controls="cinema-hero-slide"
                  className={cn(
                    "inline-flex items-center justify-center w-11 h-11 rounded-full",
                    "bg-background/65 backdrop-blur-md border border-border/60 text-foreground",
                    "hover:bg-background/90 hover:border-primary/50 active:scale-95 transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  )}
                >
                  <ChevronRight className="w-5 h-5" aria-hidden />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }
);
CinemaHero.displayName = "CinemaHero";
