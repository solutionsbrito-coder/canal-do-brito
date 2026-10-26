import { cn } from "@/lib/utils";

interface FilterChipProps {
  icon: string;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

export const FilterChip = ({ icon, label, count, active, onClick }: FilterChipProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      "snap-start shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full",
      "border font-body font-semibold text-sm transition-all duration-200 min-h-[40px]",
      active
        ? "bg-primary/15 border-primary/40 text-primary shadow-[0_0_12px_rgba(0,255,135,0.15)] scale-[1.03]"
        : "bg-surface-2 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
    )}
  >
    <span className="text-base leading-none">{icon}</span>
    <span className="whitespace-nowrap">{label}</span>
    <span
      className={cn(
        "px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums leading-none",
        active ? "bg-primary/25 text-primary" : "bg-muted/40 text-muted-foreground",
      )}
    >
      {count}
    </span>
  </button>
);
