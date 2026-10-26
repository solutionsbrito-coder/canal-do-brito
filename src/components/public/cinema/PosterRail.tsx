import { forwardRef, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PosterCard } from "./PosterCard";
import type { CinemaItem } from "./useCinemaShelves";

interface PosterRailProps {
  title: string;
  emoji: string;
  items: CinemaItem[];
  onSelect: (item: CinemaItem) => void;
}

export const PosterRail = forwardRef<HTMLElement, PosterRailProps>(
  ({ title, emoji, items, onSelect }, ref) => {
    const reduce = useReducedMotion();
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const [atStart, setAtStart] = useState(true);
    const [atEnd, setAtEnd] = useState(false);
    const [showHint, setShowHint] = useState(false);

    useEffect(() => {
      const el = scrollerRef.current;
      if (!el) return;
      let raf = 0;
      const update = () => {
        raf = 0;
        setAtStart(el.scrollLeft <= 4);
        setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
      };
      update();
      const onScroll = () => {
        if (raf) return;
        raf = requestAnimationFrame(update);
      };
      el.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", update);
      return () => {
        el.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", update);
        if (raf) cancelAnimationFrame(raf);
      };
    }, [items.length]);

    // Hint de swipe (1x por sessão por trilha) — só mobile, só se houver overflow
    useEffect(() => {
      if (reduce) return;
      const el = scrollerRef.current;
      if (!el || el.scrollWidth <= el.clientWidth + 8) return;
      const key = `cinema-rail-hinted:${title}`;
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch { /* sessionStorage indisponível */ }
      setShowHint(true);
      const t = window.setTimeout(() => setShowHint(false), 1600);
      return () => window.clearTimeout(t);
    }, [reduce, title, items.length]);

    const scrollByDir = (dir: 1 | -1) => {
      const el = scrollerRef.current;
      if (!el) return;
      el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
    };

    if (!items.length) return null;

    return (
      <section ref={ref} aria-label={title} className="space-y-3">
        <div className="flex items-baseline gap-2 px-4">
          <span aria-hidden className="text-xl leading-none">{emoji}</span>
          <h2 className="font-display text-xl tracking-wide text-foreground">{title}</h2>
          <span className="ml-1 text-xs text-muted-foreground tabular-nums">
            {items.length}
          </span>
        </div>

        <div className="relative group/rail">
          <div
            ref={scrollerRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 px-4 [mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)]"
          >
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                animate={i === 0 && showHint ? { x: [0, 14, 0] } : { x: 0 }}
                transition={i === 0 && showHint ? { duration: 1.2, ease: "easeInOut" } : { duration: 0 }}
                className="shrink-0 snap-start"
              >
                <PosterCard
                  item={item}
                  onSelect={onSelect}
                  index={i}
                  priority={i < 2}
                />
              </motion.div>
            ))}
          </div>

          {/* Setas — visíveis ≥ sm; escondidas nas bordas */}
          <button
            type="button"
            onClick={() => scrollByDir(-1)}
            aria-label={`Rolar ${title} para a esquerda`}
            className={cn(
              "hidden sm:inline-flex items-center justify-center",
              "absolute left-2 top-1/2 -translate-y-1/2 z-10",
              "w-10 h-10 rounded-full bg-background/70 backdrop-blur-md border border-border/50 text-foreground",
              "hover:bg-background/90 active:scale-95 transition-all",
              "opacity-0 group-hover/rail:opacity-100 focus-visible:opacity-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              atStart && "pointer-events-none opacity-0 group-hover/rail:opacity-0"
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollByDir(1)}
            aria-label={`Rolar ${title} para a direita`}
            className={cn(
              "hidden sm:inline-flex items-center justify-center",
              "absolute right-2 top-1/2 -translate-y-1/2 z-10",
              "w-10 h-10 rounded-full bg-background/70 backdrop-blur-md border border-border/50 text-foreground",
              "hover:bg-background/90 active:scale-95 transition-all",
              "opacity-0 group-hover/rail:opacity-100 focus-visible:opacity-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              atEnd && "pointer-events-none opacity-0 group-hover/rail:opacity-0"
            )}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </section>
    );
  }
);
PosterRail.displayName = "PosterRail";
