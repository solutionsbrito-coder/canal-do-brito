import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CinemaCategory {
  id: string;
  emoji: string;
  label: string;
  count?: number;
}

interface CinemaCategoryRailProps {
  categories: CinemaCategory[];
  active: string;
  onChange: (id: string) => void;
}

export const CinemaCategoryRail = forwardRef<HTMLDivElement, CinemaCategoryRailProps>(
  ({ categories, active, onChange }, ref) => {
    return (
      <div
        ref={ref}
        role="tablist"
        aria-label="Categorias"
        className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-1 [mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)]"
      >
        {categories.map((c) => {
          const isActive = c.id === active;
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onChange(c.id)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-full",
                "border backdrop-blur-md transition-all duration-200",
                "font-display tracking-wide text-[15px]",
                isActive
                  ? "bg-primary/15 border-primary/45 text-foreground shadow-[0_0_18px_-2px_hsl(var(--primary)/0.35)]"
                  : "bg-surface-2/60 border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <span aria-hidden className="text-base leading-none">{c.emoji}</span>
              <span>{c.label}</span>
              {typeof c.count === "number" && c.count > 0 && (
                <span className={cn(
                  "tabular-nums text-[11px] font-body",
                  isActive ? "text-primary" : "text-muted-foreground/70"
                )}>
                  {c.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }
);
CinemaCategoryRail.displayName = "CinemaCategoryRail";
