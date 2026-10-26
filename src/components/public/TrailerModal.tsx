import { forwardRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Youtube, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";

interface TrailerModalProps {
  open: boolean;
  onClose: () => void;
  trailerKey: string | null;
  loading?: boolean;
  title?: string;
  /** Fallback search query (defaults to title + "trailer") used when trailerKey is unavailable. */
  fallbackQuery?: string;
}

const buildYouTubeEmbedUrl = (key: string) => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams({
    autoplay: "1",
    rel: "0",
    modestbranding: "1",
    playsinline: "1", // iOS Safari: play inline em vez de fullscreen forçado
    iv_load_policy: "3", // sem anotações
    fs: "1",
    color: "white",
    enablejsapi: "1",
    ...(origin ? { origin } : {}),
  });
  return `https://www.youtube-nocookie.com/embed/${key}?${params.toString()}`;
};

export const TrailerModal = forwardRef<HTMLDivElement, TrailerModalProps>(({ open, onClose, trailerKey, loading, title, fallbackQuery }, ref) => {
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  // ESC closes; lock body scroll while open.
  // Captura na fase de captura + preventDefault para que, quando o trailer
  // estiver por cima de outro modal (ex.: ContentDetailSheet), apenas ele feche.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    lockBodyScroll();
    return () => {
      window.removeEventListener("keydown", onKey, true);
      unlockBodyScroll();
    };
  }, [open, onClose]);

  const embedUrl = useMemo(() => (trailerKey ? buildYouTubeEmbedUrl(trailerKey) : null), [trailerKey]);
  const searchQuery = (fallbackQuery ?? title ?? "").trim();
  const youtubeSearchUrl = searchQuery
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(`${searchQuery} trailer`)}`
    : null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
            aria-label={title ? `Trailer — ${title}` : "Trailer"}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none outline-none"
            style={{ overscrollBehavior: "contain", touchAction: "manipulation" }}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative w-full max-w-2xl pointer-events-auto">
              <button
                onClick={onClose}
                className="absolute -top-12 right-0 p-2 rounded-full bg-black/40 text-foreground/90 hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Fechar trailer"
              >
                <X className="h-6 w-6" />
              </button>

              {loading && (
                <div className="aspect-video rounded-2xl bg-card border border-border/20 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}

              {!loading && embedUrl && (
                <div className="aspect-video rounded-2xl overflow-hidden border border-border/20 shadow-2xl bg-black">
                  <iframe
                    src={embedUrl}
                    title={title ? `Trailer — ${title}` : "Trailer"}
                    className="w-full h-full"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              )}

              {!loading && !embedUrl && (
                <div className="aspect-video rounded-2xl bg-card border border-border/20 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <Youtube className="h-10 w-10 text-muted-foreground/60" />
                  <p className="text-sm font-bold text-foreground font-body">Trailer não disponível</p>
                  <p className="text-xs text-muted-foreground font-body max-w-xs">
                    Não encontramos um trailer oficial para {title ? `“${title}”` : "este conteúdo"}.
                  </p>
                  {youtubeSearchUrl && (
                    <a
                      href={youtubeSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-1 px-4 py-2 rounded-full bg-primary/15 border border-primary/40 text-primary text-xs font-bold font-body hover:bg-primary/25 transition-colors min-h-[40px]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Procurar no YouTube
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
});

TrailerModal.displayName = "TrailerModal";
