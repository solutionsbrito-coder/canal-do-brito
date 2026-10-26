import { useState, forwardRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTrailerKey } from "@/hooks/useTrailerKey";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useUpsertProgress } from "@/hooks/useWatchProgress";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
import { X, Play, Loader2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, useDragControls, type PanInfo } from "framer-motion";

interface ContentDetailSheetProps {
  open: boolean;
  onClose: () => void;
  item: {
    title: string;
    overview?: string | null;
    poster_url?: string | null;
    backdrop_url?: string | null;
    image_url?: string | null;
    rating?: number | null;
    year?: number | null;
    genre?: string | null;
    tmdb_id?: number | null;
    content_type?: string;
  } | null;
}

const DISMISS_THRESHOLD = 120;

export const ContentDetailSheet = forwardRef<HTMLDivElement, ContentDetailSheetProps>(({ open, onClose, item }, ref) => {
  const { trailerKey, loading: loadingTrailer } = useTrailerKey(
    item?.tmdb_id,
    item?.content_type,
    open
  );
  const upsertProgress = useUpsertProgress();
  const [expandOverview, setExpandOverview] = useState(false);
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 300], [1, 0.2]);
  const dragControls = useDragControls();
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  // Track view for Continue Watching — simulates progress when user opens details
  useEffect(() => {
    if (!open || !item) return;
    const simulatedProgress = Math.floor(Math.random() * 50) + 30; // 30-80%
    const contentId = String(item.tmdb_id ?? item.title);
    upsertProgress.mutate({
      content_id: contentId,
      content_type: item.content_type ?? "movie",
      title: item.title,
      poster_url: item.poster_url ?? item.image_url,
      backdrop_url: item.backdrop_url,
      rating: item.rating,
      year: item.year,
      genre: item.genre,
      progress_seconds: Math.floor((simulatedProgress / 100) * 3600),
      duration_seconds: 3600,
    });
  }, [open, item]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    if (info.offset.y > DISMISS_THRESHOLD || info.velocity.y > 500) {
      onClose();
    } else {
      dragY.set(0);
    }
  }, [onClose, dragY]);

  // ESC fecha + lock body scroll quando aberto.
  // Respeita defaultPrevented para que um modal acima (ex.: TrailerModal) consuma
  // o ESC primeiro e o sheet permaneça aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    lockBodyScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockBodyScroll();
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  if (!item) return null;

  const poster = item.poster_url || item.image_url;
  const backdrop = item.backdrop_url;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ opacity: backdropOpacity }}
            onClick={onClose}
          />

          <motion.div
            ref={(node) => {
              trapRef.current = node;
              if (typeof ref === "function") ref(node);
              else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
            }}
            role="dialog"
            aria-modal="true"
            aria-label={item.title}
            className="fixed bottom-0 left-0 right-0 z-[100] max-h-[90vh] flex flex-col rounded-t-3xl bg-card border-t border-border/30 outline-none"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragSnapToOrigin
            onDragEnd={handleDragEnd}
            style={{ y: dragY }}
          >
            {/* Drag handle — only this area triggers the drag-to-dismiss */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex justify-center pt-3 pb-2 bg-card/80 backdrop-blur-md rounded-t-3xl cursor-grab active:cursor-grabbing shrink-0"
              style={{ touchAction: "none" }}
            >
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <button
              onClick={onClose}
              className="absolute top-3 right-4 p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-secondary/50 text-foreground z-20"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Scrollable content — native scroll, no drag interference */}
            <div className="overflow-y-auto overscroll-contain flex-1">
              {/* Backdrop hero */}
              {backdrop && (
                <motion.div
                  className="relative w-full aspect-[16/9] -mt-2 overflow-hidden"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
                >
                  <img
                    src={backdrop}
                    alt=""
                    className="w-full h-full object-cover pointer-events-none"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                </motion.div>
              )}

              <div className={`px-4 space-y-4 ${backdrop ? '-mt-16 relative z-10' : ''}`} style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}>
                <div className="flex gap-3">
                  {poster && (
                    <img
                      src={poster}
                      alt={item.title}
                      className="w-24 h-auto rounded-xl object-cover border border-border/20 premium-shadow-sm pointer-events-none"
                    />
                  )}
                  <div className="flex-1 space-y-2 pt-1">
                    <h3 className="font-display text-lg font-bold text-foreground leading-tight">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.year && (
                        <span className="text-xs text-muted-foreground font-medium">{item.year}</span>
                      )}
                      {item.rating && (
                        <span className="text-xs text-amber-400 font-bold">⭐ {Number(item.rating).toFixed(1)}</span>
                      )}
                      {item.genre && item.genre.split(",").slice(0, 3).map((g, i) => (
                        <span key={i} className="text-[10px] text-primary font-semibold bg-primary/15 rounded-full px-2 py-0.5">
                          {g.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {item.overview && (
                  <div>
                    <p className={`text-sm text-muted-foreground leading-relaxed ${!expandOverview ? "line-clamp-4" : ""}`}>
                      {item.overview}
                    </p>
                    {item.overview.length > 200 && (
                      <button
                        onClick={() => setExpandOverview(!expandOverview)}
                        className="text-xs text-primary font-semibold mt-1"
                      >
                        {expandOverview ? "Ver menos" : "Ver mais"}
                      </button>
                    )}
                  </div>
                )}

                {loadingTrailer && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}

                {trailerKey && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Play className="h-3.5 w-3.5 text-primary" />
                      Trailer
                    </p>
                    <div className="aspect-video rounded-xl overflow-hidden border border-border/20 premium-shadow">
                      <iframe
                        src={`https://www.youtube.com/embed/${trailerKey}?rel=0`}
                        title="Trailer"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {!loadingTrailer && !trailerKey && item.tmdb_id && (
                  <a
                    href={`https://www.themoviedb.org/${item.content_type === "series" || item.content_type === "tv" ? "tv" : "movie"}/${item.tmdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver no TMDB
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
});

ContentDetailSheet.displayName = "ContentDetailSheet";
