import { ChevronRight, ImageOff, Star } from "lucide-react";
import { BadgePill } from "./BadgePill";
import type { NewsRelease } from "@/hooks/useNewsReleases";

const typeLabel = (t: string) => (t === "movie" ? "🎬 Filme" : t === "series" || t === "tv" ? "📺 Série" : "");

interface ContentListItemProps {
  item: NewsRelease;
  onSelect: (item: NewsRelease) => void;
}

export const ContentListItem = ({ item, onSelect }: ContentListItemProps) => (
  <button
    type="button"
    onClick={() => onSelect(item)}
    className="w-full flex gap-3 p-3 rounded-xl bg-surface-2 border border-border hover:border-primary/30 transition-colors cursor-pointer group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
  >
    <div className="relative w-16 h-24 rounded-lg overflow-hidden bg-surface border border-border shrink-0">
      {item.image_url ? (
        <img src={item.image_url} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-4 h-4 text-muted-foreground/20" /></div>
      )}
    </div>
    <div className="flex-1 min-w-0 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground line-clamp-1 font-body">{item.title}</h3>
        {item.rating != null && item.rating > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
            <span className="text-[10px] font-bold text-yellow-500 tabular-nums">{item.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <BadgePill type={item.badge_type} size="xs" />
        {typeLabel(item.content_type) && (
          <span className="text-[10px] text-muted-foreground font-body">{typeLabel(item.content_type)}</span>
        )}
        {item.year && (
          <>
            <span className="text-[10px] text-muted-foreground">•</span>
            <span className="text-[10px] text-muted-foreground font-body">{item.year}</span>
          </>
        )}
      </div>
      {item.overview && (
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed font-body">{item.overview}</p>
      )}
    </div>
    <div className="flex items-center shrink-0">
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </div>
  </button>
);
