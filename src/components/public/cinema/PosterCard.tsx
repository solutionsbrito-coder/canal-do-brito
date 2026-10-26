import { forwardRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ImageOff, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CinemaItem } from "./useCinemaShelves";

interface PosterCardProps {
  item: CinemaItem;
  onSelect: (item: CinemaItem) => void;
  index?: number;
  priority?: boolean;
}

export const PosterCard = forwardRef<HTMLButtonElement, PosterCardProps>(
  ({ item, onSelect, index = 0, priority = false }, ref) => {
    const reduce = useReducedMotion();
    const [errored, setErrored] = useState(false);

    const ratingNum = item.rating ? Number(item.rating) : null;

    return (
      <motion.button
        ref={ref}
        type="button"
        onClick={() => onSelect(item)}
        aria-label={`Abrir ${item.title}`}
        whileHover={reduce ? undefined : { scale: 1.04 }}
        whileTap={reduce ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className={cn(
          "group relative shrink-0 snap-start text-left",
          "w-[42vw] max-w-[164px] sm:w-40 md:w-44",
          "rounded-xl overflow-hidden",
          "bg-surface-2 border border-border/40",
          "shadow-[0_18px_40px_-22px_rgba(0,0,0,0.9)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        )}
      >
        <div className="relative aspect-[2/3] w-full bg-surface-2">
          {item.poster_url && !errored ? (
            <img
              src={item.poster_url}
              alt={item.title}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={priority ? "high" : "auto"}
              onError={() => setErrored(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/60">
              <ImageOff className="w-6 h-6" />
            </div>
          )}

          {/* bottom gradient for legibility */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />

          {ratingNum !== null && ratingNum > 0 && (
            <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-md bg-background/70 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-bold text-foreground">
              <Star className="w-2.5 h-2.5 fill-primary text-primary" />
              <span className="tabular-nums">{ratingNum.toFixed(1)}</span>
            </div>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-2">
          <p className="font-display text-[13px] leading-tight tracking-wide text-foreground line-clamp-2">
            {item.title}
          </p>
          {item.year && (
            <p className="text-[10px] text-muted-foreground font-body mt-0.5 tabular-nums">
              {item.year}
            </p>
          )}
        </div>
      </motion.button>
    );
  }
);
PosterCard.displayName = "PosterCard";
